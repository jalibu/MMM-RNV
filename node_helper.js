/* Magic Mirror
 * Module: MMM-RNV
 *
 * By Julian Dinter
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');

const { ApolloClient } = require('apollo-client');
const { InMemoryCache } = require('apollo-cache-inmemory');
const { HttpLink } = require('apollo-link-http');
const { setContext } = require('apollo-link-context');

const gql = require('graphql-tag');
const fetch = require('node-fetch');

module.exports = NodeHelper.create({
    start: function() {
        this.config = null;
        this.client = null;
    },

    end: function() {
        console.log("Ending: " + this.name);
    },

    socketNotificationReceived: async function(notification, payload) {
        if (notification == "SET_CONFIG") {
            this.config = payload;

            if (this.config.apiKey == '' || !this.config.apiKey) {
                console.log(this.name + ": Creating APIKey...");
                const oAuthURL = this.config.oAuthURL;
                const clientID = this.config.clientID;
                const clientSecret = this.config.clientSecret;
                const resourceID = this.config.resourceID;
                // Create apiKey from given credentials
                this.config.apiKey = await this.createToken(oAuthURL, clientID, clientSecret, resourceID);
            }
            // Authenticate by OAuth
            this.client = this.authenticate(this.config.apiKey);
        }
        // Retrieve data from RNV-Server
        this.getData();
    },

    getData: function() {
        console.log(this.name + ": Fetching data from RNV-Server...");
        const now = new Date().toISOString();
        const numJourneys = this.config.numJourneys;
        const stationID = this.config.stationID;

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
        }`;
        this.client.query({ query: gql(query) }).then(fetchedData => {
            // Remove elements where its depature time is equal to null
            // Iteration from end of array since the command *splice* might reduce its size.
            for (let i = fetchedData.data.station.journeys.elements.length - 1; i >= 0; i--) {
                if (fetchedData.data.station.journeys.elements[i].stops[0].plannedDeparture.isoString == null) {
                    fetchedData.data.station.journeys.elements.splice(i, 1);
                }
            }

            // Sorting fetched data based on the departure times
            fetchedData.data.station.journeys.elements.sort((a, b) => {
                let depA = a.stops[0].plannedDeparture.isoString;
                let depB = b.stops[0].plannedDeparture.isoString;
                return (depA < depB) ? -1 : ((depA > depB) ? 1 : 0);
            });

            
            const numDepartures = fetchedData.data.station.journeys.elements.length;
            const delayFactor = 60 * 1000;

            for (let i = 0; i < numDepartures; i++) {
                // Create new key-value pair, representing the current delay of the departure
                fetchedData.data.station.journeys.elements[i].stops[0].delay = 0;
                // If there is no realtime departure data avaialble, skip delay calculation and continue with next departure
                if (fetchedData.data.station.journeys.elements[i].stops[0].realtimeDeparture.isoString == null) {
                    continue;
                }
                
                let currentDepartureTimes = fetchedData.data.station.journeys.elements[i].stops[0];
                // Planned Departure
                let plannedDepartureIsoString = currentDepartureTimes.plannedDeparture.isoString;
                let plannedDepartureDate = new Date(plannedDepartureIsoString);
                // Realtime Departure
                let realtimeDepartureIsoString = currentDepartureTimes.realtimeDeparture.isoString;
                let realtimeDepartureDate = new Date(realtimeDepartureIsoString);

                let delayms = Math.abs(plannedDepartureDate - realtimeDepartureDate);
                let delay = Math.floor(delayms / delayFactor);

                // Assign calculated delay to new introduced key-value pair
                fetchedData.data.station.journeys.elements[i].delay = delay;
            }

            // Log fetched data
            for (let i = 0; i < numDepartures; i++) {
                let c = fetchedData.data.station.journeys.elements[i];
                let t = c.stops[0].plannedDeparture.isoString;
                let d = c.stops[0].destinationLabel;
                let l = c.line.id.split("-")[1];
                let p = c.stops[0].pole.platform.label;
                let delay = c.stops[0].delay;
                console.log(t, "\t", l, "\t", p, "\t", delay, "\t", d);
            }

            // Send data to front-end
            this.sendSocketNotification("DATA", fetchedData);

        }).catch((error) => console.log("Error while querying data from server:\n", error));
        
        // Set timeout to continuously fetch new data from RNV-Server
        setTimeout(this.getData.bind(this), (this.config.updateInterval));
    },

    // Create access token if there is none given in the configuration file
    createToken: async function(OAUTH_URL, CLIENT_ID, CLIENT_SECRET, RESOURCE_ID) {
        const response = await fetch(OAUTH_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: 'grant_type=client_credentials&client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET + '&resource=' + RESOURCE_ID 
        });
        
        if (!response.ok) {
            console.error("Error while creating access token.", response.error);
            return null;
        }
        const json = await response.json();
        return json["access_token"];
    },
    
    // Authenticate with given token
    authenticate: function(token) {        
        var httpLink = new HttpLink({uri: this.config.clientAPIURL, credentials: 'same-origin', fetch: fetch});
        
        var middlewareAuthLink = setContext(async (_, { headers }) => {
            return {
                headers: {
                    ...headers,
                    authorization: token ? `Bearer ${token}` : null,
                },
            };
        });
        
        var client = new ApolloClient({
            link: middlewareAuthLink.concat(httpLink),
            cache: new InMemoryCache()
        })
        return client;
    }
});
