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

const MAX_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 1000
const MAX_CONSECUTIVE_FAILURES = 5
const MAX_RETRY_AFTER_DELAY_MS = 5 * 60 * 1000

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const parseRetryAfterHeader = (value: string | null): number | undefined => {
  if (!value) {
    return undefined
  }

  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(Math.round(seconds * 1000), MAX_RETRY_AFTER_DELAY_MS)
  }

  const retryDateMs = Date.parse(value)
  if (Number.isNaN(retryDateMs)) {
    return undefined
  }

  return Math.min(Math.max(retryDateMs - Date.now(), 0), MAX_RETRY_AFTER_DELAY_MS)
}

// Network errors (no status) and transient server/auth/rate-limit responses are worth retrying.
const isRetryableStatus = (status?: number): boolean =>
  status === undefined || status === 401 || status === 403 || status === 429 || (status >= 500 && status <= 599)

interface RetryAwareError extends Error {
  status?: number
  retryAfterMs?: number
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

  async getData(config: Config) {
    try {
      // Create client (with retry for transient failures)
      if (!this.accessToken) {
        try {
          this.accessToken = await this.withRetry(() => this.createAccessToken(config), 'Access token request')
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

      const departures: Departure[] = await this.withRetry(async () => {
        // A rejected token is dropped below, so re-acquire it before retrying.
        if (!this.accessToken) {
          this.accessToken = await this.createAccessToken(config)
        }

        const journeyStart = new Date(Date.now() + config.walkingTimeMs)
        Log.info(`Request departures for station '${config.stationId}'`)

        try {
          const apiResponse = await this.fetchGraphql(config.clientApiUrl, query, this.accessToken, {
            stationId: config.stationId,
            startTime: journeyStart.toISOString()
          })

          return mapApiDepartures(apiResponse.data.station.journeys.elements, {
            excludeLines: config.excludeLines,
            excludePlatforms: config.excludePlatforms,
            highlightLines: config.highlightLines,
            maxResults: config.maxResults,
            colorCodesMap: this.colorCodesMap as Map<string, Departure['color']>,
            warn: (message) => Log.warn(message)
          })
        } catch (err) {
          const status = err instanceof Error ? (err as Error & { status?: number }).status : undefined
          // Drop an expired/rejected token so the next attempt requests a fresh one.
          if (status === 401 || status === 403) {
            this.accessToken = null
          }
          throw err
        }
      }, 'Departure request')

      this.failedRequests = 0

      // Send data to front-end
      this.sendSocketNotification(`RNV_DATA_RESPONSE_${config.stationId}`, departures)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      Log.warn(`Error fetching the data from the API: ${message}`)
      this.failedRequests += 1

      if (this.failedRequests > MAX_CONSECUTIVE_FAILURES) {
        this.sendSocketNotification('RNV_ERROR_RESPONSE', {
          type: 'ERROR',
          message: 'Error fetching data.'
        })
        this.failedRequests = 0
      }
    }
  },

  // Runs an operation with bounded exponential-backoff retries for transient failures.
  async withRetry<T>(operation: () => Promise<T>, label: string): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await operation()
      } catch (err) {
        const status = err instanceof Error ? (err as RetryAwareError).status : undefined
        if (!isRetryableStatus(status) || attempt >= MAX_ATTEMPTS) {
          throw err
        }

        const retryAfterMs = err instanceof Error ? (err as RetryAwareError).retryAfterMs : undefined
        const delayMs =
          status === 429 && retryAfterMs !== undefined ? retryAfterMs : RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
        const message = err instanceof Error ? err.message : String(err)
        Log.warn(`${label} failed (${message}). Retrying in ${delayMs} ms (attempt ${attempt}/${MAX_ATTEMPTS - 1})...`)
        await sleep(delayMs)
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
      const error: RetryAwareError = new Error(
        `Could not fetch the access token (${response.status} ${response.statusText})`
      )
      error.status = response.status
      if (response.status === 429) {
        error.retryAfterMs = parseRetryAfterHeader(response.headers.get('retry-after'))
      }
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
      const error: RetryAwareError = new Error(`GraphQL request failed (${response.status} ${response.statusText})`)
      error.status = response.status
      if (response.status === 429) {
        error.retryAfterMs = parseRetryAfterHeader(response.headers.get('retry-after'))
      }
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
