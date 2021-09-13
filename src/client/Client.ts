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
    apiKey: null,
    clientId: null,
    resourceId: null,
    clientSecret: null,
    oAuthUrl: null,
    tenantId: null,
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
    this.credentials = false
    this._departures = null

    if (
      this.config.apiKey ||
      (this.config.clientId && this.config.clientSecret && this.config.tenantId && this.config.resourceId)
    ) {
      this.credentials = true
      // Build oAuthURL based on given tenantID.
      this.config.oAuthUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/token`

      this.sendSocketNotification('SET_CONFIG', this.config)
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
      utils,
      moment
    }
  },

  // Override socket notification handler.
  socketNotificationReceived(notification, payload) {
    if (notification == 'DATA') {
      console.log('Departures', payload)
      this._departures = payload
      this.hasLoaded = true

      // Update dom with given animation speed
      this.updateDom(this.hasLoaded ? 0 : this.config.animationSpeedMs)
    } else if (notification == 'ERROR') {
      // TODO: Update front-end to display specific error.
    }
  }
})
