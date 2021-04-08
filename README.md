# MMM-RNV

<p style="text-align: center">
    <a href="https://david-dm.org/jupadin/MMM-RNV"><img src="https://david-dm.org/jupadin/MMM-RNV.svg" alt ="Dependency Status"></a>
    <a href="https://choosealicense.com/licenses/mit"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
    <a href="https://codecov.io/gh/jupadin/MMM-RNV"><img src="https://codecov.io/gh/jupadin/MMM-RNV/branch/master/graph/badge.svg?token=PG4L6MTHU9"/>
</a>
</p>

This module is an extention for the [MagicMirror](https://github.com/MichMich/MagicMirror).

The module is based on the work of [yawnsde](https://github.com/yawnsde/MMM-RNV) but uses the new Data Hub API.

The module monitors a given station in the RNV traffic network and shows by default the 10 upcoming departures with its destination, type and delay. It also shows additional information like the platform.
Either a valid API key or credentials are required, which can be requested here for free: https://opendata.rnv-online.de/datahub-api

## Installation

Open a terminal session, navigate to your MagicMirror's `modules` folder and execute `git clone https://github/jupadin/MMM-RNV.git`, such that a new folder called MMM-RNV will be created.

Navigate inside the folder and execute `npm install` to install all dependencies.

Activate the module by adding it to the `config.js` file of the MagicMirror as shown below.

The ID of your specific station can be found here: https://rnvopendataportalpublic.blob.core.windows.net/public/openDataPortal/liniengruppen_mit_haltestellenreferenz.json


The table below lists all possible costimizations like the position and header.

## Using the module
````javascript
    modules: [
        {
            module: 'MMM-RNV',
            header: 'RNV Abfahrsmonitor',
            position: 'top_right',
            config: {
                apiKey: 'ENTER YOUR APIKEY HERE',
            }
        }
    ]
````

## Configuration options

The following properties can be set:

### Authentication

| Option | Type | Default | Description |
| ---- | ---- | ---- | ---- |
| `apiKey` | String | "" | Your personal API Key |
| or |
| `clientID`| String | "" | Your personal client ID
| `clientSecret` | String | "" | Your personal client secret
| `resourceID`| String | "" | |


### Module

| Option | Type | Default | Description |
| ---- | ---- | ---- | ---- |
| `stationID` | String | 2417 | ID for Mannheim HBF |
| `numJourneys` | String | 10 | Number of shown departures. |