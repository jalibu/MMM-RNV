import Utils from './Utils'
import { Config } from '../types/Config'

// Global or injected variable declarations
interface Logger {
  log: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

declare const Log: Logger
declare const moment: (value?: unknown) => unknown

Module.register<Config>('MMM-RNV', {
  // Default module config.
  defaults: {
    animationSpeedMs: 2 * 1000, // 2 seconds
    updateIntervalMs: 1 * 60 * 1000, // every 1 minute
    walkingTimeMs: 3 * 60 * 1000,
    stationId: '2417',
    showLineColors: true,
    maxResults: 10,
    credentials: {
      clientId: '',
      clientSecret: '',
      resourceId: '',
      tenantId: ''
    },
    clientApiUrl: 'https://graphql-sandbox-dds.rnv-online.de',
    timeformat: 'HH:mm',
    showPlatform: false,
    showTableHeadersAsSymbols: false,
    highlightLines: [],
    excludeLines: [],
    excludePlatforms: [],
    icons: {
      STRASSENBAHN: 'fas fa-train',
      STADTBUS: 'fas fa-bus'
    }
  },

  // Define start sequence.
  start() {
    Log.info(`Starting module: ${this.name}`)
    this.hasLoaded = false
    this.departures = null
    this.errors = null
    this.updateInterval = null

    const { credentials } = this.config

    if (credentials?.clientId && credentials?.clientSecret && credentials?.tenantId && credentials?.resourceId) {
      this.getData()
      this.updateInterval = setInterval(() => {
        this.getData()
      }, this.config.updateIntervalMs)
    } else {
      this.errors = { type: 'ERROR', message: 'No API credentials provided' }
    }
  },

  getData() {
    this.sendSocketNotification('RNV_DEPARTURE_REQUEST', this.config)
  },

  suspend() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  },

  resume() {
    if (!this.updateInterval && this.config.credentials?.clientId) {
      this.getData()
      this.updateInterval = setInterval(() => {
        this.getData()
      }, this.config.updateIntervalMs)
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
      departures: this.departures,
      config: this.config,
      errors: this.errors,
      utils,
      moment
    }
  },

  // Override socket notification handler.
  socketNotificationReceived(notification, payload) {
    if (notification === `RNV_DATA_RESPONSE_${this.config.stationId}`) {
      Log.debug('Departures', payload)
      this.departures = payload
      this.errors = null
      this.hasLoaded = true

      // Update dom with given animation speed
      this.updateDom(this.hasLoaded ? 0 : this.config.animationSpeedMs)
    } else if (notification === 'RNV_ERROR_RESPONSE') {
      Log.warn(payload)
      this.errors = payload
      this.updateDom(0)
    }
  }
})
