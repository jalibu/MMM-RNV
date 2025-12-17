# MMM-RNV

[![version](https://img.shields.io/github/package-json/v/jalibu/MMM-RNV)](https://github.com/jalibu/MMM-RNV/releases) [![Known Vulnerabilities](https://snyk.io/test/github/jalibu/MMM-RNV/badge.svg?targetFile=package.json)](https://snyk.io/test/github/jalibu/MMM-RNV?targetFile=package.json)

This is a departure monitor for the Rhein-Neckar-Verkehr (RNV) public transport network for the [MagicMirror²](https://magicmirror.builders/) platform.  
It shows upcoming departures with their destination, type, delay and platform.

Contribution welcome.

## Demo

![screenshot](screenshot.png)

## Installing the Module

1. Navigate to the `MagicMirror/modules` directory and execute the following command

   ```sh
   git clone https://github.com/jalibu/MMM-RNV
   ```

2. Request your API Key here: [Data Hub API](https://www.opendata-oepnv.de/ht/de/organisation/verkehrsunternehmen/rnv/openrnv/api). Select **GraphQL** (not GTFS) in the form.

3. [Find the stationId](https://rnvopendataportalpublic.blob.core.windows.net/public/openDataPortal/liniengruppen_mit_haltestellenreferenz.json) of the station that should be displayed.

4. Add the module configuration into the `config.js` file (sample configuration):
   ```javascript
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
       timeformat: 'HH:mm',
       updateIntervalMs: 1 * 60 * 1000, // every 1 minute
       walkingTimeMs: 3 * 60 * 1000 // 3 minutes footwalk
     }
   },
   ```

## Options

| Option                      | Description                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `animationSpeedMs`          | Duration of fade-in animation. <br><br>**Type:** `int` <br> **Default value:** `2000`                                                             |
| `credentials`               | Your RNV API credentials. <br><br>**Type:** `Credentials` <br> **Default value:** `empty object`                                                  |
| `excludeLines`              | List of excluded lines. <br><br>**Type:** `string array` <br> **Default value:** `[]`                                                             |
| `excludePlatforms`          | List of excluded platforms, e.g. if you only want to see one direction. <br><br>**Type:** `string array` <br> **Default value:** `[]`             |
| `highlightLines`            | List of highlighted lines. <br><br>**Type:** `string array` <br> **Default value:** `[]`                                                          |
| `maxResults`                | Limits number of results. <br><br>**Type:** `int` <br> **Default value:** `10`                                                                    |
| `showLineColors`            | Set to true, to colorize the lines. <br><br>**Type:** `boolean` <br> **Default value:** `true`                                                    |
| `showPlatform`              | Set to true, to display platform. <br><br>**Type:** `boolean` <br> **Default value:** `false`                                                     |
| `showTableHeadersAsSymbols` | Set to true, to show symbols instead of texts in header. <br><br>**Type:** `boolean` <br> **Default value:** `false`                              |
| `stationId`                 | ID of the station that should be displayed.<br><br>**Type:** `int` <br> **Default value:** `2417` (Mannheim Hbf)                                  |
| `timeformat`                | Time format for the departure time. <br><br>**Type:** `string` <br> **Default value:** `HH:mm`                                                    |
| `updateIntervalMs`          | Determines how often updates should be loaded from server. <br><br>**Type:** `int` <br> **Default value:** `60000` (every 1 minute)               |
| `walkingTimeMs`             | Filter for departures that are reachable considering the walking time.<br><br>**Type:** `int` <br> **Default value:** `3 * 60 * 1000` (3 minutes) |

## Credentials Object

| Option         | Description                                                              |
| -------------- | ------------------------------------------------------------------------ |
| `clientId`     | Your clientId. <br><br>**Type:** `string` <br> **Default value:** ``     |
| `resourceId`   | Your resourceId. <br><br>**Type:** `string` <br> **Default value:**``    |
| `clientSecret` | Your clientSecret. <br><br>**Type:** `string` <br> **Default value:** `` |
| `tenantId`     | Your tenantId. <br><br>**Type:** `string` <br> **Default value:**``      |

## Update

To update the module, navigate to the module directory and pull the latest changes:

```sh
cd ~/MagicMirror/modules/MMM-RNV
git pull
```

## Contribution and Development

This module is written in TypeScript and compiled with Rollup.  
The source files are located in the `/src` directory.
Compile target files with `node --run build`.

Contribution for this module is welcome!

### Available Scripts

| Script                  | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `node --run build`      | Production build (minified, optimized)                    |
| `node --run dev`        | Development build with inline sourcemaps                  |
| `node --run dev:watch`  | Watch mode for active development                         |
| `node --run test`       | Full quality check (TypeScript + ESLint + Prettier)       |
| `node --run type-check` | TypeScript type validation only                           |
| `node --run lint`       | Check code style (ESLint + Prettier)                      |
| `node --run lint:fix`   | Auto-fix code style issues                                |
| `node --run release`    | Create release (bumps version, rebuilds, creates git tag) |

### Development Workflow

```bash
# Start development with watch mode
node --run dev:watch

# Before committing, run full quality check
node --run test

# Auto-fix any linting/formatting issues
node --run lint:fix

# When ready for release
node --run release
```

### Git Hooks

Following Git hooks are automatically activated (via simple-git-hooks):

- **pre-commit**: runs `npm run test`
- **pre-push**: runs `npm run build`

### Release

Releases are handled with `node --run release` (commit-and-tag-version). The script bumps the version, creates a git tag, rebuilds the bundled files (MMM-RNV.js, node_helper.js), and stages them via the configured postbump step.

## Thanks to

- [jupadin](https://github.com/jupadin)
- [yawnsde](https://github.com/yawnsde)
