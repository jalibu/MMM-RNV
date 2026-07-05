/* global module */

let config = {
  address: "0.0.0.0",
  ipWhitelist: [],
  logLevel: ["INFO", "LOG", "WARN", "ERROR", "DEBUG"],
  modules: [
    {
      module: "clock",
      position: "middle_center"
    },
   {
     module: 'MMM-RNV',
     position: 'top_left',
     config: {
       animationSpeedMs: 2 * 1000, // 2 seconds
       credentials: {
         clientId: '',
         clientSecret: '',
         resourceId: '',
         tenantId: ''
       },
       excludeLines: [], // example ["N1", "5"]
       excludePlatforms: [], // example ["A"]
       highlightLines: [], // example ["1"]
       maxResults: 10,
       showLineColors: true,
       showPlatform: false,
       showTableHeadersAsSymbols: false,
       stationId: '2417',
       updateIntervalMs: 1 * 60 * 1000, // every 1 minute
       walkingTimeMs: 3 * 60 * 1000 // 3 minutes footwalk
     }
   },
  ]
};

/** ************* DO NOT EDIT THE LINE BELOW */
if (typeof module !== "undefined") {
  module.exports = config;
}
