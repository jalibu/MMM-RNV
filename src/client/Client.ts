import Utils from './Utils'
import { Config } from '../types/Config'

// Global or injected variable declarations
declare const Log: any
declare const moment: any

Module.register<Config>('MMM-RNV', {
  // Default module config.
  defaults: {
    animationSpeedMs: 2 * 1000, // 2 seconds
    updateIntervalMs: 1 * 60 * 1000, // every 1 minute
    stationId: '2417',
    showLineColors: true,
    maxResults: 10,
    credentials: null,
    clientApiUrl: 'https://graphql-sandbox-dds.rnv-online.de',
    timeformat: 'HH:mm',
    showPlatform: false,
    showTableHeadersAsSymbols: false,
    highlightLines: [],
    excludeLines: [],
    icons: {
      STRASSENBAHN: 'fas fa-train',
      STADTBUS: 'fas fa-bus'
    }
  },

  // Define start sequence.
  start() {
    Log.info('Starting module: ' + this.name)
    this.hasLoaded = false
    this._departures = null
    this._errors = null

    const credentials = this.config.credentials

    if (
      credentials?.apiKey ||
      (credentials?.clientId && credentials?.clientSecret && credentials?.tenantId && credentials?.resourceId)
    ) {
      // Build oAuthURL based on given tenantID.
      credentials.oAuthUrl = `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/token`

      this.sendSocketNotification('RNV_CONFIG_REQUEST', this.config)
    } else {
      this._errors = { type: 'ERROR', message: 'No API credentials provided' }
    }
  },

  // Define required styles.
  getStyles() {
    return ['MMM-RNV.css', 'font-awesome.css']
  },

  getScripts() {
    return ['moment.js']
  },

  // Define required translations.
  getTranslations() {
    return {
      de: 'translations/de.json'
    }
  },

  getTemplate() {
    return 'templates/MMM-RNV.njk'
  },

  getTemplateData() {
    const utils = new Utils(this.config)
    return {
      departures: this._departures,
      config: this.config,
      errors: this._errors,
      utils,
      moment
    }
  },

  // Override socket notification handler.
  socketNotificationReceived(notification, payload) {
    if (notification == 'RNV_DATA_RESPONSE') {
      console.log('Departures', payload)
      this._departures = payload
      this._errors = null
      this.hasLoaded = true

      // Update dom with given animation speed
      this.updateDom(this.hasLoaded ? 0 : this.config.animationSpeedMs)
    } else if (notification == 'RNV_ERROR_RESPONSE') {
      console.log("gut", payload)
      this._errors = payload
      this.updateDom(0)
    }
  }
})
