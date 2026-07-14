export const GET_DEPARTURES_QUERY = `query GetDepartures($stationId: String!, $startTime: String!) {
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
