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

    socketNotificationReceived: function(notification, payload) {
        if (notification == "SET_CONFIG") {
            this.config = payload;

            if (!this.config.apiKey) {
                console.log(this.name + ": Creating APIKey...");
                const oauthURL = this.config.oauthURL;
                const clientID = this.config.clientID;
                const clientSecret = this.config.clientSecret;
                const resourceID = this.config.resourceID;
                // Set apiKey to config object
                this.config.apiKey = this.createToken(oauthURL, clientID, clientSecret, resourceID);
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
                                id
                                pole {
                                    id
                                    platform {
                                        type
                                        label
                                        barrierFreeType
                                    }
                                }
                                destinationLabel
                                plannedDeparture {
                                    isoString
                                }
                                realtimeDeparture {
                                    isoString
                                }
                                plannedArrival {
                                    isoString
                                }
                                realtimeArrival {
                                    isoString
                                }
                            }
                        }
                    }
                }
            }
        }`;
        this.client.query({ query: gql(query) }).then(fetchedData => {
            // console.log(JSON.stringify(fetchedData, null, "  "));
            this.sendSocketNotification("DATA", fetchedData);
        }).catch((error) => console.log("Error:\n", error));
        
        // setTimeout(this.getData(), (this.config.refreshInterval));
    },

    // Create access token if there is non given
    createToken: function(OAUTH_URL, CLIENT_ID, CLIENT_SECRET, RESOURCE_ID) {
        const accessToken = async () => {
            const promise = new Promise(async (resolve, reject) => {
                const response = await fetch(OAUTH_URL, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: 'grant_type=client_credentials&client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET + '&resource=' + RESOURCE_ID 
                });
        
                if (response.status != 200 || !response.ok) {
                    reject("Error: Fetch code is != 200");
                }

                resolve(response.json());
            }).catch((error) => console.log("Error: ", error))

            const json = await promise;
            return json["access_token"];
        }
        return accessToken;
    },
    
    // Authenticate if token is given
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
