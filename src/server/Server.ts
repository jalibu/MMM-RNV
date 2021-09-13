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
import { Departure } from '../types/Departure'

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
      const departures: Departure[] = []
      const apiResponse = await this.client.query({ query: gql(query) })

      // Remove elements where its depature time is equal to null
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

        const departure: Departure = {
          line: apiDeparture.line.id.split('-')[1],
          destination: apiDeparture.stops[0].destinationLabel,
          departure: plannedDepartureDate.getTime(),
          delayInMin: delayInMinutes,
          platform: apiDeparture.stops[0].pole.platform.label
        }

        departures.push(departure)
      }

      // Set flag to check whether a previous fetch was successful
      this.previousFetchOk = true

      // Send data to front-end
      this.sendSocketNotification('DATA', departures)
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
          this.client = this.createClient()

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
