/* Magic Mirror
 * Module: MMM-RNV
 *
 * By Julian Dinter
 * MIT Licensed.
 */

Module.register("MMM-RNV",{
   // Default module config.
   defaults: {
        header: "RNV Abfahrtsmonitor",
        animationSpeed: 2 * 1000, // 2 seconds
        stationID: "2417",
        numJourneys: "10",
        apiKey: "",
        clientID: "",
        resourceID: "",
        clientSecret: "",
        oAuthURL: "",
        clientAPIURL: "https://graphql-sandbox-dds.rnv-online.de",
        updateInterval: 1 * 60 * 1000, // every 1 minute
        icon: {
            "STRASSENBAHN" : "fas fa-train",
            "STADTBUS" : "fas fa-bus"
        },
    },
    
    // Define start sequence.
    start: function() {
        Log.info("Starting module: " + this.name); 
        this.loaded = false;
        this.credentials = false;
        this.fetchedData = null;

        if ( (this.config.apiKey) || (this.config.clientID && this.config.clientSecret && this.config.oAuthURL && this.config.resourceID) ) {
            this.credentials = true;
            this.sendSocketNotification("SET_CONFIG", this.config);
        }
    },
    
    // Define required styles.
    getStyles: function() {
        return['MMM-RNV.css', "font-awesome.css"];
    },
    
    // Define required scripts.
    getScripts: function() {
        return [];
    },
    
    // Define header.
    getHeader: function() {
        return this.config.header;
    },
    
    // Override dom generator.
    getDom: function() {
        const wrapper = document.createElement("div");
        
        if (!this.credentials) {
            wrapper.innerHTML = "There are no <i>RNV Credentials</i> in config file set.";
            wrapper.className = "light small dimmed";
            return wrapper;
        }
        if (this.config.stationID == "") {
            wrapper.innerHTML = "No <i>stationID</i> in config file set.";
            wrapper.className = "light small dimmed";
            return wrapper;
        }
        if (!this.loaded) {
            wrapper.innerHTML = "Loading...";
            wrapper.className = "light small dimmed";
            return wrapper;
        }

        if (this.loaded && this.fetchedData.data.station.journeys.elements.length == 0) {
            wrapper.innerHTML = "No data available";
            wrapper.className = "light small dimmed";
            return wrapper;
        }

        // Create dom table
        const table = document.createElement("table");
        table.id = "RNVTable";
        table.className = "light small";

        const tableHead = document.createElement("tr");

        const tableHeadTime = document.createElement("th");
        tableHeadTime.innerHTML = "Abfahrt";
        tableHeadTime.className = "RNVTableHeader Departure";

        const tableHeadLine = document.createElement("th");
        tableHeadLine.innerHTML = "Linie";
        tableHeadLine.className = "RNVTableHeader Line";

        const tableHeadDestination = document.createElement("th");
        tableHeadDestination.innerHTML = "Richtung";
        tableHeadDestination.className = "RNVTableHeader Direction";

        const tableHeadPlatform = document.createElement("th");
        tableHeadPlatform.innerHTML = "Gleis";
        tableHeadPlatform.className = "RNVTableHeader Platform";

        tableHead.appendChild(tableHeadTime);
        tableHead.appendChild(tableHeadLine);
        tableHead.appendChild(tableHeadDestination);
        tableHead.appendChild(tableHeadPlatform);

        table.appendChild(tableHead);

        // Horizontal rule after table header
        const hruleRow = document.createElement("tr");
        const hruleData = document.createElement("td");
        hruleData.colSpan = 4;
        hruleData.innerHTML = "<hr>";

        hruleRow.appendChild(hruleData);
        table.appendChild(hruleRow);

        // Variable declaration for table data
        const factor = 60 * 1000;
        let delay = 0;
        let delayMilliseconds = 0;
        let departures = this.fetchedData.data.station.journeys.elements;

        // Sort departures based on their planned departure
        departures.sort(function(a, b) {
            let depA = a.stops[0].plannedDepartureIsoString;
            let depB = b.stops[0].plannedDepartureIsoString;
            return (depA < depB) ? -1 : (depA > depB) ? 1 : 0;
        });

        // Iterating over data
        for (let i = 0; i < departures.length; i++) {
            let currentDeparture  = departures[i];
            let line = currentDeparture.line.id.split("-")[0];
            // console.log(line);
            
            let type = currentDeparture.type;
            
            let destination = currentDeparture.stops[0].destinationLabel;
            // console.log(destination);
            let platform = currentDeparture.stops[0].pole.platform.label;
            //console.log(platform);

            let departureTimes = currentDeparture.stops[0];

            let plannedDepartureIsoString = departureTimes.plannedDeparture.isoString;
            let plannedDepartureDate = new Date(plannedDepartureIsoString);
            let plannedDeparture = plannedDepartureDate.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit', hour12: false});
            //console.log(plannedDeparture);

            let realtimeDepartureIsoString = departureTimes.realtimeDeparture.isoString;
            let realtimeDepartureDate = new Date(realtimeDepartureIsoString);
            // let realtimeDeparture = realtimeDepartureDate.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit', hour12: false});
            //console.log(realtimeDeparture);

            // let plannedArrivalIsoString = departureTimes.plannedArrival.isoString;
            // let plannedArrivalDate = new Date(plannedArrivalIsoString);
            // let plannedArrival = plannedArrivalDate.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit', hour12: false});
            //console.log(plannedArrival);
            
            // let realtimeArrivalIsoString = departureTimes.realtimeArrival.isoString;
            // let realtimeArrivalDate = new Date(realtimeArrivalIsoString);
            // let realtimeArrival = realtimeArrivalDate.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit', hour12: false});
            //console.log(realtimeArrival);

            if (realtimeDepartureIsoString != null) {
                delayMilliseconds = Math.abs(plannedDepartureDate - realtimeDepartureDate);
                delay = Math.floor(delayMilliseconds / factor);
            }

            // Time
            let dataCellTime = document.createElement("td");
            dataCellTime.className = "data";
            dataCellTime.innerHTML = plannedDeparture;

            // -- Delay
            let dataCellTimeDelay = document.createElement("span");
            dataCellTimeDelay.className = "small delay";
            if (delay > 0) {
                dataCellTimeDelay.innerHTML = "+ " + delay;
                dataCellTimeDelay.classList.add("late");
            } else if (delay < 0) {
                dataCellTimeDelay.innerHTML = "- " + delay;
                dataCellTimeDelay.classList.add("early");
            } else {
                dataCellTimeDelay.innerHTML = "+ " + delay;
                dataCellTimeDelay.style.visibility = "hidden";
            }
            
            dataCellTime.appendChild(dataCellTimeDelay);
            
            // Line
            let dataCellLine = document.createElement("td");
            dataCellLine.className = "data";
            // -- Span
            let dataCellLineSpan = document.createElement("span");
            dataCellLineSpan.className = "icon";
            // ---- Icon
            let dataCellLineIcon = document.createElement("i");
            dataCellLineIcon.className = this.config.icon[type];

            dataCellLineSpan.appendChild(dataCellLineIcon);    
            dataCellLine.innerHTML = line;
            
            // Direction
            let dataCellDirection = document.createElement("td");
            dataCellDirection.className = "data";
            dataCellDirection.innerHTML = destination;

            // Platform
            let dataCellPlatform = document.createElement("td");
            dataCellPlatform.className = "data";
            dataCellPlatform.innerHTML = platform;
            
            let dataRow = document.createElement("tr");
            dataRow.appendChild(dataCellTime);
            dataRow.appendChild(dataCellLine);
            dataRow.appendChild(dataCellDirection);
            dataRow.appendChild(dataCellPlatform);
            
            table.appendChild(dataRow);
        }
        wrapper.appendChild(table);

        // Return the wrapper to the dom.
        return wrapper;
    },
    
    // Override socket notification handler.
    socketNotificationReceived: function(notification, payload) {
        // console.log(this.name + " received a socket notification: " + notification + " - Payload: " + payload);
        this.fetchedData = payload;
        this.loaded = true;
        this.updateDom(this.config.animationSpeed);
    }
});
