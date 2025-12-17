// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any
import * as NodeHelper from 'node_helper'
import * as Log from 'logger'
import { Departure } from '../types/Departure'
import { Config } from '../types/Config'

interface ApiDeparture {
  line: { id: string }
  type: string
  stops: {
    pole: { platform: { label: string } }
    destinationLabel: string
    plannedDeparture: { isoString: string | null }
    realtimeDeparture: { isoString: string | null }
  }[]
}

interface ColorCode {
  id: string
  [key: string]: unknown
}

module.exports = NodeHelper.create({
  start() {
    this.accessToken = null
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
      const json = (await results.json()) as { lineGroups: ColorCode[] }
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
      if (!this.accessToken) {
        try {
          this.accessToken = await this.createAccessToken(config)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          ;(Log.error ?? Log.warn)(`Error generating the client: ${message}`)
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
      const apiResponse = await this.fetchGraphql(config.clientApiUrl, query, this.accessToken)

      // Remove elements where depature time is not set
      const apiDepartures = apiResponse.data.station.journeys.elements.filter(
        (journey: ApiDeparture) => journey.stops[0].plannedDeparture.isoString !== null
      )

      // Sorting fetched data based on the departure times
      apiDepartures.sort((a: ApiDeparture, b: ApiDeparture) => {
        const depA = a.stops[0].plannedDeparture.isoString
        const depB = b.stops[0].plannedDeparture.isoString

        if (!depA || !depB) return 0
        return depA < depB ? -1 : depA > depB ? 1 : 0
      })

      for (const apiDeparture of apiDepartures) {
        const plannedIso = apiDeparture.stops[0].plannedDeparture.isoString
        if (!plannedIso) {
          continue
        }
        const plannedDepartureDate = new Date(plannedIso)

        // Delay calculation
        let delayInMinutes = 0
        try {
          const realtimeIso = apiDeparture.stops[0].realtimeDeparture.isoString
          if (!realtimeIso) {
            throw new Error('Missing realtime departure')
          }
          const realtimeDepartureDate = new Date(realtimeIso)
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
        this.accessToken = null
        Log.log('Reset the RNV API access token')

        this.sendSocketNotification('RNV_ERROR_RESPONSE', {
          type: 'WARNING',
          message: 'Error fetching data.'
        })
      }
    }
  },

  async createAccessToken(config: Config): Promise<string> {
    const { clientId, clientSecret, resourceId, tenantId } = config.credentials

    const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&resource=${resourceId}`
    })

    if (!response.ok) {
      throw Error(`Could not fetch the access token (${response.status} ${response.statusText})`)
    }

    const { access_token } = (await response.json()) as { access_token: string }
    Log.log('Created new RNV API access token')
    return access_token
  },

  async fetchGraphql(
    uri: string,
    query: string,
    token: string
  ): Promise<{
    data: { station: { journeys: { elements: ApiDeparture[] } } }
  }> {
    const response = await fetch(uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ query })
    })

    if (!response.ok) {
      throw Error(`GraphQL request failed (${response.status} ${response.statusText})`)
    }

    const body = (await response.json()) as {
      data: { station: { journeys: { elements: ApiDeparture[] } } }
      errors?: { message: string }[]
    }
    if (body.errors?.length) {
      throw Error(body.errors.map((e) => e.message).join('; '))
    }
    return body
  }
})
