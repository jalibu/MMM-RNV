import * as NodeHelper from 'node_helper'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import { setContext } from 'apollo-link-context'
import gql from 'graphql-tag'
import * as Log from 'logger'
import { Departure } from '../types/Departure'
import { Config } from '../types/Config'

type ApiDeparture = {
  line: { id: string }
  type: string
  stops: Array<{
    pole: { platform: { label: string } }
    destinationLabel: string
    plannedDeparture: { isoString: string | null }
    realtimeDeparture: { isoString: string | null }
  }>
}

module.exports = NodeHelper.create({
  start() {
    this.client = null
    this.schedule = []
    this.colorCodes = []
    this.failedRequests = 0
    this.getColorCodes()
  },

  async getColorCodes() {
    try {
      const results = await fetch(
        'https://rnvopendataportalpublic.blob.core.windows.net/public/openDataPortal/liniengruppen-farben.json'
      )
      const json = (await results.json()) as any
      this.colorCodes = json.lineGroups
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      Log.warn(`Could not request color codes: ${message}`)
    }
  },

  async socketNotificationReceived(notification, payload) {
    if (notification === 'RNV_DEPARTURE_REQUEST') {
      const config = payload
      // Retrieve data from RNV-Server
      this.getData(config)
    }
  },

  async getData(config: Config) {
    try {
      // Create client
      if (!this.client) {
        try {
          this.client = await this.createClient(config)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          Log.error(`Error generating the client: ${message}`)
          this.sendSocketNotification('RNV_ERROR_RESPONSE', {
            type: 'WARNING',
            message: 'Error with API authentication.'
          })

          return
        }
      }
      const journeyStart = new Date(Date.now() + config.walkingTimeMs)

      Log.info(`Request departures for station '${config.stationId}'`)
      const query = `query {
            station(id:"${config.stationId}") {
                hafasID
                longName
                journeys(startTime: "${journeyStart.toISOString()}" first: 50) {
                    totalCount
                    elements {
                        ... on Journey {
                            line {
                                id
                            }
                            type
                            stops(onlyHafasID: "${config.stationId}") {
                                pole {
                                    platform {
                                        type
                                        label
                                        barrierFreeType
                                    }
                                }
                                destinationLabel
                                plannedArrival {
                                    isoString
                                }
                                realtimeArrival {
                                    isoString
                                }
                                plannedDeparture {
                                    isoString
                                }
                                realtimeDeparture {
                                    isoString
                                }
                            }
                        }
                    }
                }
            }
        }`

      const departures: Departure[] = []
      const apiResponse = await this.client.query({ query: gql(query) })

      // Remove elements where depature time is not set
      const apiDepartures = (apiResponse.data.station.journeys.elements as ApiDeparture[]).filter(
        (journey) => journey.stops[0].plannedDeparture.isoString !== null
      )

      // Sorting fetched data based on the departure times
      apiDepartures.sort((a: ApiDeparture, b: ApiDeparture) => {
        const depA = a.stops[0].plannedDeparture.isoString!
        const depB = b.stops[0].plannedDeparture.isoString!

        /* eslint-disable-next-line no-nested-ternary */
        return depA < depB ? -1 : depA > depB ? 1 : 0
      })

      for (const apiDeparture of apiDepartures) {
        const plannedDepartureDate = new Date(apiDeparture.stops[0].plannedDeparture.isoString as string)

        // Delay calculation
        let delayInMinutes = 0
        try {
          const realtimeDepartureDate = new Date(apiDeparture.stops[0].realtimeDeparture.isoString as string)
          // Positive => delayed, Negative => early
          const delayInMs = realtimeDepartureDate.getTime() - plannedDepartureDate.getTime()
          delayInMinutes = Math.round(delayInMs / (60 * 1000))
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          Log.warn(`Error calculating the delay: ${message}`)
        }

        const line = apiDeparture.line.id.split('-')[1]
        if (
          config.excludeLines.includes(line) ||
          config.excludePlatforms.includes(apiDeparture.stops[0].pole.platform.label)
        ) {
          continue
        }

        const departure: Departure = {
          line,
          destination: apiDeparture.stops[0].destinationLabel,
          departure: plannedDepartureDate.getTime(),
          delayInMin: delayInMinutes,
          platform: apiDeparture.stops[0].pole.platform.label,
          type: apiDeparture.type,
          highlighted: config.highlightLines.includes(line),
          color: this.colorCodes.find((code: { id: string }) => code.id === line)
        }

        departures.push(departure)
        if (departures.length === config.maxResults) {
          break
        }
      }

      this.failedRequests = 0

      // Send data to front-end
      this.sendSocketNotification(`RNV_DATA_RESPONSE_${config.stationId}`, departures)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      Log.warn(`Error fetching the data from the API: ${message}`)
      this.failedRequests += 1

      if (this.failedRequests > 5) {
        this.client = null
        Log.log('Reset the RNV API client')

        this.sendSocketNotification('RNV_ERROR_RESPONSE', {
          type: 'WARNING',
          message: 'Error fetching data.'
        })
      }
    }
  },

  async createClient(config: Config) {
    // Create Access Token
    const { clientId, clientSecret, resourceId, tenantId } = config.credentials

    const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&resource=${resourceId}`
    })

    if (!response.ok) {
      throw Error(`Could not fetch the access token (${response.status} ${response.statusText})`)
    }
    /* eslint-disable-next-line camelcase */
    const { access_token } = await response.json()
    Log.log('Created new RNV API access token')

    const httpLink = createHttpLink({ uri: config.clientApiUrl, fetch: fetch as any })

    const middlewareAuthLink = setContext(async (_, { headers }) => {
      return {
        headers: {
          ...headers,
          /* eslint-disable-next-line camelcase */
          authorization: access_token ? `Bearer ${access_token}` : null
        }
      }
    })

    return new ApolloClient({
      link: middlewareAuthLink.concat(httpLink),
      cache: new InMemoryCache()
    })
  }
})
