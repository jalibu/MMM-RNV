import * as NodeHelper from 'node_helper'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import { setContext } from 'apollo-link-context'
import gql from 'graphql-tag'
import fetch from 'node-fetch'
import { Departure } from '../types/Departure'

module.exports = NodeHelper.create({
  start() {
    this.config = null
    this.client = null
    this.schedule = null
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
      console.warn('Could not request color codes', err)
    }
  },

  async socketNotificationReceived(notification, payload) {
    if (notification === 'RNV_CONFIG_REQUEST') {
      this.config = payload

      // Retrieve data from RNV-Server
      this.getData()
      if (!this.schedule) {
        this.schedule = setInterval(this.getData.bind(this), this.config.updateIntervalMs)
      }
    }
  },

  async getData() {
    try {
      // Create client
      if (!this.client) {
        try {
          this.client = await this.createClient()
        } catch (err) {
          console.error(`Error generating the client: ${err.message}`)
          this.sendSocketNotification('RNV_ERROR_RESPONSE', {
            type: 'WARNING',
            message: 'Error with API authentication.'
          })

          return
        }
      }
      const query = `query {
            station(id:"${this.config.stationId}") {
                hafasID
                longName
                journeys(startTime: "${new Date().toISOString()}" first: 50) {
                    totalCount
                    elements {
                        ... on Journey {
                            line {
                                id
                            }
                            type
                            stops(onlyHafasID: "${this.config.stationId}") {
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
      const apiDepartures = apiResponse.data.station.journeys.elements.filter(
        (journey) => journey.stops[0].plannedDeparture.isoString !== null
      )

      // Sorting fetched data based on the departure times
      apiDepartures.sort((a, b) => {
        const depA = a.stops[0].plannedDeparture.isoString
        const depB = b.stops[0].plannedDeparture.isoString

        /* eslint-disable-next-line no-nested-ternary */
        return depA < depB ? -1 : depA > depB ? 1 : 0
      })

      for (const apiDeparture of apiDepartures) {
        const plannedDepartureDate = new Date(apiDeparture.stops[0].plannedDeparture.isoString)

        // Delay calculation
        let delayInMinutes = 0
        try {
          const realtimeDepartureDate = new Date(apiDeparture.stops[0].realtimeDeparture.isoString)
          const delayInMs = Math.abs(plannedDepartureDate.getMilliseconds() - realtimeDepartureDate.getMilliseconds())
          delayInMinutes = Math.floor((delayInMs / 60) * 1000)
        } catch (err) {
          console.warn(`Error calculating the delay: ${err.message}`)
        }

        const line = apiDeparture.line.id.split('-')[1]
        if (this.config.excludeLines.includes(line)) {
          continue
        }

        const departure: Departure = {
          line,
          destination: apiDeparture.stops[0].destinationLabel,
          departure: plannedDepartureDate.getTime(),
          delayInMin: delayInMinutes,
          platform: apiDeparture.stops[0].pole.platform.label,
          type: apiDeparture.type,
          highlighted: this.config.highlightLines.includes(line),
          color: this.colorCodes.find((code) => code.id === line)
        }

        departures.push(departure)
        if (departures.length === this.config.maxResults) {
          break
        }
      }

      this.failedRequests = 0

      // Send data to front-end
      this.sendSocketNotification('RNV_DATA_RESPONSE', departures)
    } catch (err) {
      console.warn(`Error fetching the data from the API: ${err.message}`)
      this.failedRequests += 1

      if (this.failedRequests > 5) {
        this.client = null
        console.log('Reset the RNV API client')

        this.sendSocketNotification('RNV_ERROR_RESPONSE', {
          type: 'WARNING',
          message: 'Error fetching data.'
        })
      }
    }
  },

  async createClient() {
    // Create Access Token
    const { clientId, clientSecret, resourceId, tenantId } = this.config.credentials

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
    console.log('Created new RNV API access token')

    const httpLink = createHttpLink({ uri: this.config.clientApiUrl, fetch })

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
