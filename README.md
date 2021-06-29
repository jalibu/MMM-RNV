# MMM-RNV

<p style="text-align: center">
    <a href="https://david-dm.org/jupadin/MMM-RNV"><img src="https://david-dm.org/jupadin/MMM-RNV.svg" alt ="Dependency Status"></a>
    <a href="https://choosealicense.com/licenses/mit"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
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


The table below lists all possible configuration options.

## Using the module
````javascript
    modules: [
        {
            module: 'MMM-RNV',
            header: 'RNV Abfahrstmonitor',
            position: 'top_right',
            config: {
                apiKey: 'Enter your apiKey here',
                or
                clientID: 'Enter your @clientID here',
                clientSecret: 'Enter your @clientSecret here',
                resourceID: 'Enter your @resource here',
                oAuthURL: 'Enter your @scope URL here'

            }
        }
    ]
````

## Configuration options

The following configuration options can be set and/or changed:

### Authentication

| Option | Type | Default | Description | Given names from RNV |
| ---- | ---- | ---- | ---- | ---- |
| `apiKey` | String | "" | Your personal API Key | - |
| or |
| `clientID`| String | "" | Your client ID | @clientID |
| `clientSecret` | String | "" | Your client secret | @clientSecret |
| `resourceID`| String | "" | Your resourceID | @resource |
| `oAuthURL` | String | "" | URL to authentication site to generate the access token | @scope |

The remaining data and credentials, provided by the RNV, is not needed.

### Module

| Option | Type | Default | Description |
| ---- | ---- | ---- | ---- |
| `header` | String | "RNV Abfahrtsmonitor" | Header which will be displayed |
| `stationID` | String | "2417" | ID for Mannheim HBF |
| `numJourneys` | String | "10" | Number of shown departures. |
| `updateInterval` | String | "1" | How often the table shall be updated [minutes] |
| `animationSpeed` | String | "2" | Animation speed to show up the table [seconds] |