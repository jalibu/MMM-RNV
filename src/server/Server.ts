/* Magic Mirror
 * Module: MMM-RNV
 *
 * By Julian Dinter
 * MIT Licensed.
 */

import * as NodeHelper from 'node_helper'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { HttpLink } from 'apollo-link-http'
import { setContext } from 'apollo-link-context'
import gql from 'graphql-tag'
import fetch from 'node-fetch'
import { Config } from '../types/Config'

module.exports = NodeHelper.create({
  start() {
    this.config = null
    this.client = null
    this.previousFetchOk = false
  },

  async socketNotificationReceived(notification, payload) {
    if (notification == 'SET_CONFIG') {
      const moduleConfig = payload as Config

      // Create apiKey from given credentials
      if (!moduleConfig.apiKey) {
        moduleConfig.apiKey = await this.createToken(
          moduleConfig.oAuthURL,
          moduleConfig.clientID,
          moduleConfig.clientSecret,
          moduleConfig.resourceID
        )
      }

      this.config = moduleConfig

      // Authenticate by OAuth
      this.client = this.createClient()
    }

    // Retrieve data from RNV-Server
    this.getData()
  },

  async getData() {
    const now = new Date().toISOString()
    const numJourneys = this.config.numJourneys
    const stationID = this.config.stationID

    const query = `query {
            station(id:"${stationID}") {
                hafasID
                longName
                journeys(startTime: "${now}" first: ${numJourneys}) {
                    totalCount
                    elements {
                        ... on Journey {
                            line {
                                id
                            }
                            type
                            stops(onlyHafasID: "${stationID}") {
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
      const fetchedData = await this.client.query({ query: gql(query) })

      // Remove elements where its depature time is equal to null
      const journeys = fetchedData.data.station.journeys.elements.filter(
        (journey) => journey.stops[0].plannedDeparture.isoString == null
      )

      // Sorting fetched data based on the departure times
      journeys.sort((a, b) => {
        let depA = a.stops[0].plannedDeparture.isoString
        let depB = b.stops[0].plannedDeparture.isoString
        return depA < depB ? -1 : depA > depB ? 1 : 0
      })

      // Delay
      for (const journey of journeys) {
        // Create new key-value pair, representing the current delay of the departure
        journey.stops[0].delay = 0
        // If there is no realtime departure data avaialble, skip delay calculation and continue with next departure
        if (journey.stops[0].realtimeDeparture.isoString === null) {
          continue
        }

        const departureTimes = journey.stops[0]
        const plannedDepartureDate = new Date(departureTimes.plannedDeparture.isoString)
        const realtimeDepartureDate = new Date(departureTimes.realtimeDeparture.isoString)

        // Delay calculation
        const delayInMs = Math.abs(plannedDepartureDate.getMilliseconds() - realtimeDepartureDate.getMilliseconds())
        let delay = Math.floor((delayInMs / 60) * 1000)

        // Assign calculated delay to new introduced key-value pair
        journey.stops[0].delay = delay
      }

      // Set flag to check whether a previous fetch was successful
      this.previousFetchOk = true

      // Send data to front-end
      this.sendSocketNotification('DATA', journeys)
    } catch (err) {
      // If there is "only" a apiKey given in the configuration,
      // tell the user to update the key (since it is expired).
      const clientID = this.config.clientID
      const clientSecret = this.config.clientSecret
      const resourceID = this.config.resourceID
      const oAuthURL = this.config.oAuthURL
      const previousFetchOk = this.previousFetchOk

      if (clientID && clientSecret && oAuthURL && resourceID && previousFetchOk) {
        // Reset previousFetchOk, since there was an error (key expired (?))
        this.previousFetchOk = false
        // Update apiKey with given credentials
        this.createToken(oAuthURL, clientID, clientSecret, resourceID).then((key) => {
          // Renew apiKey
          this.config.apiKey = key

          // Renew client
          this.client = this.authenticate(this.config.apiKey)

          // Fetch new data from RNV-Server
          this.getData()
        })
      } else {
        // Create error return value
        const errValue = 1
        // And send socket notification back to front-end to display the / an error...
        this.sendSocketNotification('ERROR', errValue)
      }
    }

    // Set timeout to continuously fetch new data from RNV-Server
    setTimeout(this.getData.bind(this), this.config.updateInterval)
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
      console.error('Error while creating access token.', response.error)
      return null
    }
    const json = await response.json()
    
    return json['access_token']
  },

  createClient() {
    const token = this.config.apiKey
    const httpLink = new HttpLink({ uri: this.config.clientAPIURL, credentials: 'same-origin', fetch: fetch })

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
