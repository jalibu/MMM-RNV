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
        refreshInterval: 1 * 60 * 1000, // every 1 minute
    },
    
    // Define start sequence.
    start: function() {
        Log.info("Starting module: " + this.name); 
        this.loaded = false;
        this.credentials = false;
        this.fetchedData = null;

        if ( (this.config.apiKey) || (this.config.cliendID && this.config.clientSecret && this.config.oAuthURL && this.config.resourceID) ) {
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

        if (this.loaded && !this.fetchedData.data.station.journeys.elements.length) {
            wrapper.innerHTML = "No data available";
            wrapper.className = "light small dimmed";
            return wrapper;
        }

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
        tableHeadLine.colSpan = 2;

        const tableHeadDestination = document.createElement("th");
        tableHeadDestination.innerHTML = "Richtung";
        tableHeadDestination.className = "RNVTableHeader Destination";

        const tableHeadPlatform = document.createElement("th");
        tableHeadPlatform.innerHTML = "Gleis";
        tableHeadPlatform.className = "RNVTableHeader Platform";

        tableHead.appendChild(tableHeadTime);
        tableHead.appendChild(tableHeadLine);
        tableHead.appendChild(tableHeadDestination);
        tableHead.appendChild(tableHeadPlatform);

        table.appendChild(tableHead);

        // Iterating over data
        for (let i = 0; i < this.fetchedData.data.station.journeys.elements.length; i++) {
            const currentDeparture  = this.fetchedData.data.station.journeys.elements[i];
            const line = currentDeparture.line.id.split("-")[0];
            // console.log(line);
            
            const type = currentDeparture.type;
            
            const destination = currentDeparture.stops[0].destinationLabel;
            // console.log(destination);
            const platform = currentDeparture.stops[0].pole.platform.label;
            //console.log(platform);

            const departureTimes = currentDeparture.stops[0];

            const plannedDepartureIsoString = departureTimes.plannedDeparture.isoString;
            const plannedDepartureDate = new Date(plannedDepartureIsoString);
            const plannedDeparture = plannedDepartureDate.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit', hour12: false});
            //console.log(plannedDeparture);

            const realtimeDepartureIsoString = departureTimes.realtimeDeparture.isoString;
            const realtimeDepartureDate = new Date(realtimeDepartureIsoString);
            // const realtimeDeparture = realtimeDepartureDate.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit', hour12: false});
            //console.log(realtimeDeparture);

            // const plannedArrivalIsoString = departureTimes.plannedArrival.isoString;
            // const plannedArrivalDate = new Date(plannedArrivalIsoString);
            // const plannedArrival = plannedArrivalDate.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit', hour12: false});
            //console.log(plannedArrival);
            
            // const realtimeArrivalIsoString = departureTimes.realtimeArrival.isoString;
            // const realtimeArrivalDate = new Date(realtimeArrivalIsoString);
            // const realtimeArrival = realtimeArrivalDate.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit', hour12: false});
            //console.log(realtimeArrival);

            const delayMilliseconds = Date(plannedDepartureDate) - Date(realtimeDepartureDate);
            console.log(delayMilliseconds);
            const factor = 60 * 1000;
            const delay = Math.floor(delayMilliseconds / factor);

            //console.log(delay);

            const dataCellTime = document.createElement("td");
            dataCellTime.innerHTML = plannedDeparture;

            const dataCellTimeDelayed = document.createElement("span");
            dataCellTimeDelayed.className = "small";

            if (delay > 0) {
                dataCellTimeDelayed.innerHTML = ' +' + delay;
                dataCellTimeDelayed.classList.add("late");
            } else if (delay < 0) {
                dataCellTimeDelayed.innerHTML = ' -' + delay;
                dataCellTimeDelayed.classList.add("early");
            } else {
                dataCellTimeDelayed.style.visibility = 'hidden';
            }
            
            dataCellTime.appendChild(dataCellTimeDelayed);
            
            const dataCellLineSymbol = document.createElement("td");
            const dataCellLineSymbolSpan = document.createElement("span");
            dataCellLineSymbolSpan.className = "fa fa-bus";
            dataCellLineSymbol.appendChild(dataCellLineSymbolSpan);

            const dataCellLine = document.createElement("td");           
            dataCellLine.innerHTML = line;
            dataCellLine.className = "line";
            
            const dataCellDirection = document.createElement("td");
            dataCellDirection.innerHTML = destination;

            const dataCellPlatform = document.createElement("td");
            dataCellPlatform.innerHTML = platform;
            
            const dataRow = document.createElement("tr");
            dataRow.appendChild(dataCellTime);
            dataRow.appendChild(dataCellLineSymbol);
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
