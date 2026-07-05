// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any
import NodeHelper from 'node_helper'
import * as Log from 'logger'
import { Color, Departure } from '../types/Departure'
import { Config } from '../types/Config'
import { ApiDeparture, mapApiDepartures } from './DepartureMapper'

interface ColorCode {
  id: string
  primary: Color['primary']
  secondary: Color['secondary']
  contrast: Color['contrast']
}

module.exports = NodeHelper.create({
  start() {
    this.accessToken = null
    this.schedule = []
    this.colorCodesMap = new Map()
    this.failedRequests = 0
    this.getColorCodes()
  },

  async getColorCodes() {
    try {
      const results = await fetch(
        'https://rnvopendataportalpublic.blob.core.windows.net/public/openDataPortal/liniengruppen-farben.json'
      )
      const json = (await results.json()) as { lineGroups: ColorCode[] }
      this.colorCodesMap = new Map(json.lineGroups.map((code) => [code.id, code]))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      Log.warn(`Could not request color codes: ${message}`)
    }
  },

  async socketNotificationReceived(notification: string, payload: Config) {
    if (notification === 'RNV_DEPARTURE_REQUEST') {
      const config = payload
      // Retrieve data from RNV-Server
      this.getData(config)
    }
  },

  async getData(config: Config, isRetry = false) {
    try {
      // Create client
      if (!this.accessToken) {
        try {
          this.accessToken = await this.createAccessToken(config)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          ;(Log.error ?? Log.warn)(`Error generating the client: ${message}`)
          this.sendSocketNotification('RNV_ERROR_RESPONSE', {
            type: 'ERROR',
            message: 'Error with API authentication.'
          })

          return
        }
      }
      const journeyStart = new Date(Date.now() + config.walkingTimeMs)

      Log.info(`Request departures for station '${config.stationId}'`)
      const query = `query GetDepartures($stationId: String!, $startTime: String!) {
            station(id: $stationId) {
                hafasID
                longName
                journeys(startTime: $startTime, first: 50) {
                    totalCount
                    elements {
                        ... on Journey {
                            line {
                                id
                            }
                            type
                            stops(onlyHafasID: $stationId) {
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

      const apiResponse = await this.fetchGraphql(config.clientApiUrl, query, this.accessToken, {
        stationId: config.stationId,
        startTime: journeyStart.toISOString()
      })

      const departures: Departure[] = mapApiDepartures(apiResponse.data.station.journeys.elements, {
        excludeLines: config.excludeLines,
        excludePlatforms: config.excludePlatforms,
        highlightLines: config.highlightLines,
        maxResults: config.maxResults,
        colorCodesMap: this.colorCodesMap as Map<string, Departure['color']>,
        warn: (message) => Log.warn(message)
      })

      this.failedRequests = 0

      // Send data to front-end
      this.sendSocketNotification(`RNV_DATA_RESPONSE_${config.stationId}`, departures)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const status = err instanceof Error ? (err as Error & { status?: number }).status : undefined

      // Auth errors: reset token and retry once
      if ((status === 401 || status === 403) && !isRetry) {
        Log.warn(`Authentication error (${status}), resetting token and retrying...`)
        this.accessToken = null
        this.getData(config, true)
        return
      }

      // Other errors or failed retry
      Log.warn(`Error fetching the data from the API: ${message}`)
      this.failedRequests += 1

      if (this.failedRequests > 5) {
        this.sendSocketNotification('RNV_ERROR_RESPONSE', {
          type: 'ERROR',
          message: 'Error fetching data.'
        })
        this.failedRequests = 0
      }
    }
  },

  async createAccessToken(config: Config): Promise<string> {
    const { clientId, clientSecret, resourceId, tenantId } = config.credentials

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      resource: resourceId
    })

    const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })

    if (!response.ok) {
      const error: Error & { status?: number } = new Error(
        `Could not fetch the access token (${response.status} ${response.statusText})`
      )
      error.status = response.status
      throw error
    }

    const { access_token } = (await response.json()) as { access_token: string }
    Log.log('Created new RNV API access token')
    return access_token
  },

  async fetchGraphql(
    uri: string,
    query: string,
    token: string,
    variables?: Record<string, unknown>
  ): Promise<{
    data: { station: { journeys: { elements: ApiDeparture[] } } }
  }> {
    const response = await fetch(uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ query, variables })
    })

    if (!response.ok) {
      const error: Error & { status?: number } = new Error(
        `GraphQL request failed (${response.status} ${response.statusText})`
      )
      error.status = response.status
      throw error
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
