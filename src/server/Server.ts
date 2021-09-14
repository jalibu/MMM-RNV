import * as NodeHelper from 'node_helper'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { createHttpLink } from 'apollo-link-http'
import { setContext } from 'apollo-link-context'
import gql from 'graphql-tag'
import fetch from 'node-fetch'
import { Config } from '../types/Config'
import { Departure } from '../types/Departure'

module.exports = NodeHelper.create({
  start() {
    this.config = null
    this.client = null
    this.schedule = null
    this.colorCodes = []
    this.previousFetchOk = false
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
    if (notification == 'RNV_CONFIG_REQUEST') {
      const moduleConfig = payload as Config
      // Create apiKey from given credentials
      if (!moduleConfig.credentials?.apiKey) {
        moduleConfig.credentials.apiKey = await this.createToken(
          moduleConfig.credentials.oAuthUrl,
          moduleConfig.credentials.clientId,
          moduleConfig.credentials.clientSecret,
          moduleConfig.credentials.resourceId
        )
      }

      this.config = moduleConfig

      // Authenticate by OAuth
      if (!this.client) {
        this.client = this.createClient()
      }

      // Retrieve data from RNV-Server
      this.getData()
      if (!this.schedule) {
        this.schedule = setInterval(this.getData.bind(this), this.config.updateIntervalMs)
      }
    }
  },

  async getData() {
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

    try {
      const departures: Departure[] = []
      const apiResponse = await this.client.query({ query: gql(query) })

      // Remove elements where depature time is not set
      const apiDepartures = apiResponse.data.station.journeys.elements.filter(
        (journey) => journey.stops[0].plannedDeparture.isoString !== null
      )

      // Sorting fetched data based on the departure times
      apiDepartures.sort((a, b) => {
        let depA = a.stops[0].plannedDeparture.isoString
        let depB = b.stops[0].plannedDeparture.isoString
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
          console.warn('There was a problem calculating the delay', err)
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

      // Set flag to check whether a previous fetch was successful
      this.previousFetchOk = true

      // Send data to front-end
      this.sendSocketNotification('RNV_DATA_RESPONSE', departures)
    } catch (err) {
      console.warn('There was a problem with the API request', err)
      // If there is "only" a apiKey given in the configuration,
      // tell the user to update the key (since it is expired).
      const clientID = this.config.clientId
      const clientSecret = this.config.clientSecret
      const resourceID = this.config.resourceId
      const oAuthURL = this.config.oAuthUrl
      const previousFetchOk = this.previousFetchOk

      if (clientID && clientSecret && oAuthURL && resourceID && previousFetchOk) {
        // Reset previousFetchOk, since there was an error (key expired (?))
        this.previousFetchOk = false
        // Update apiKey with given credentials
        this.createToken(oAuthURL, clientID, clientSecret, resourceID).then((key) => {
          // Renew apiKey
          this.config.apiKey = key

          // Renew client
          this.client = this.createClient()

          // Fetch new data from RNV-Server
          this.getData()
        })
      }
      this.sendSocketNotification('RNV_ERROR_RESPONSE', {
        type: 'WARNING',
        message: 'Error fetching data.'
      })
    }
  },

  // Create access token if there is none given in the configuration file
  async createToken(OAUTH_URL, CLIENT_ID, CLIENT_SECRET, RESOURCE_ID) {
    const response = await fetch(OAUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:
        'grant_type=client_credentials&client_id=' +
        CLIENT_ID +
        '&client_secret=' +
        CLIENT_SECRET +
        '&resource=' +
        RESOURCE_ID
    })

    if (!response.ok) {
      console.error('Error while creating access token.', response.statusText)
      return null
    }
    const json = await response.json()

    return json['access_token']
  },

  createClient() {
    const token = this.config.credentials.apiKey
    const httpLink = createHttpLink({ uri: this.config.clientApiUrl, fetch: fetch })

    const middlewareAuthLink = setContext(async (_, { headers }) => {
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : null
        }
      }
    })

    return new ApolloClient({
      link: middlewareAuthLink.concat(httpLink),
      cache: new InMemoryCache()
    })
  }
})
