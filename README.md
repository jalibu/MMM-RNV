# MMM-RNV

[![dependencies Status](https://status.david-dm.org/gh/jalibu/MMM-RNV.svg)](https://david-dm.org/jalibu/MMM-RNV) [![Known Vulnerabilities](https://snyk.io/test/github/jalibu/MMM-RNV/badge.svg?targetFile=package.json)](https://snyk.io/test/github/jalibu/MMM-RNV?targetFile=package.json)

This module for the [MagicMirror²](https://magicmirror.builders/) platform monitors a given station in the RNV traffic network.  
It shows upcoming departures with their destination, type, delay and platform.

Contribution welcome.

### Demo

![image](https://user-images.githubusercontent.com/25933231/133120000-fa4ea8d3-5cc4-43c6-b23c-216a9d890988.png)

## Installing the Module

1. Navigate to the `MagicMirror/modules` directory and execute the following command

   ```sh
   git clone https://github.com/jalibu/MMM-RNV.git
   ```

2. Change into the MMM-RNV module folder and install runtime dependencies with

   ```sh
   cd MMM-RNV
   npm install --only=production
   ```

3. Request your API Key [here](https://opendata.rnv-online.de/datahub-api).

4. Add the module configuration into the `MagicMirror/config/config.js` file (sample configuration):

   ```javascript
    {
        module: "MMM-RNV",
        position: "top_left",
        config: {
            animationSpeedMs: 2 * 1000, // 2 seconds
            updateIntervalMs: 1 * 60 * 1000, // every 1 minute
            stationId: '2417',
            showLineColors: true,
            maxResults: 10,
            clientId: null,
            resourceId: null,
            clientSecret: null,
            tenantId: null,
            timeformat: 'HH:mm',
            showPlatform: false,
            showTableHeadersAsSymbols: false,
            highlightLines: [], // example ["1"]
            excludeLines: [], // example ["N1", "5"]
        }
    }
   ```

### Options

| Option                      | Description                                                                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `animationSpeedMs`          | Duration of fade-in animation. <br><br>**Type:** `int` <br> **Default value:** `2000`                                                                                                                                                                         |
| `updateIntervalMs`          | Determines how often updates should be loaded from server. <br><br>**Type:** `int` <br> **Default value:** `60000`                                                                                                                                            |
| `stationId`                 | ID of the station that should be displayed.<br>Find your stationId [here](https://rnvopendataportalpublic.blob.core.windows.net/public/openDataPortal/liniengruppen_mit_haltestellenreferenz.json).<br><br>**Type:** `int` <br> **Default value:** `2417` (Mannheim Hbf) |
| `showLineColors`            | Set to true, to colorize the lines. <br><br>**Type:** `boolean` <br> **Default value:** `true`                                                                                                                                                                |
| `maxResults`                | Limits number of results. <br><br>**Type:** `int` <br> **Default value:** `10`                                                                                                                                                                                |
| `clientId`                  | Your clientId. <br><br>**Type:** `string` <br> **Default value:** ``                                                                                                                                                                                          |
| `resourceId`                | Your resourceId. <br><br>**Type:** `string` <br> **Default value:** ``                                                                                                                                                                                        |
| `clientSecret`              | Your clientSecret. <br><br>**Type:** `string` <br> **Default value:** ``                                                                                                                                                                                      |
| `tenantId`                  | Your tenantId. <br><br>**Type:** `string` <br> **Default value:** ``                                                                                                                                                                                          |
| `timeformat`                | Time format for the departure time. <br><br>**Type:** `string` <br> **Default value:** `HH:mm`                                                                                                                                                                |
| `showPlatform`              | Set to true, to display platform. <br><br>**Type:** `boolean` <br> **Default value:** `false`                                                                                                                                                                 |
| `showTableHeadersAsSymbols` | Set to true, to show symbols instead of texts in header. <br><br>**Type:** `boolean` <br> **Default value:** `false`                                                                                                                                          |
| `highlightLines`            | List of highlighted lines. <br><br>**Type:** `string array` <br> **Default value:** `[]`                                                                                                                                                                      |
| `excludeLines`              | List of excluded lines. <br><br>**Type:** `string array` <br> **Default value:** `[]`                                                                                                                                                                         |

## Contribution and Development

This module is written in TypeScript and compiled with Rollup.  
The source files are located in the `/src` folder.
Compile target files with `npm run build`.

Contribution for this module is welcome!

## Thanks to
