/* Magic Mirror
 * Module: MMM-RNV
 *
 * By Julian Dinter
 * MIT Licensed.
 */

import { Config } from '../types/Config'

// Global or injected variable declarations
declare const Log: any

Module.register<Config>('MMM-RNV', {
  // Default module config.
  defaults: {
    header: 'RNV Abfahrtsmonitor',
    animationSpeed: 2 * 1000, // 2 seconds
    updateInterval: 1 * 60 * 1000, // every 1 minute
    stationID: '2417',
    numJourneys: 10,
    apiKey: '',
    clientID: '',
    resourceID: '',
    clientSecret: '',
    oAuthURL: '',
    tenantID: '',
    clientAPIURL: 'https://graphql-sandbox-dds.rnv-online.de',
    icon: {
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
      (this.config.clientID && this.config.clientSecret && this.config.tenantID && this.config.resourceID)
    ) {
      this.credentials = true
      // Build oAuthURL based on given tenantID.
      this.config.oAuthURL = 'https://login.microsoftonline.com/' + this.config.tenantID + '/oauth2/token'
      this.sendSocketNotification('SET_CONFIG', this.config)
    }
  },

  // Define required styles.
  getStyles() {
    return ['MMM-RNV.css', 'font-awesome.css']
  },

  // Define required scripts.
  getScripts() {
    return []
  },

  // Define required translations.
  getTranslations() {
    return {
      de: 'translations/de.json'
    }
  },

  // Define header.
  getHeader() {
    return this.config.header
  },


  getTemplate() {
    return 'templates/MMM-RNV.njk'
  },

  getTemplateData() {
    return {
      departures: this._departures
    }
  },

  // Override socket notification handler.
  socketNotificationReceived(notification, payload) {
    if (notification == 'DATA') {
      console.log(payload)
      let animationSpeed = this.config.animationSpeed
      if (this.hasLoaded) {
        animationSpeed = 0
      }
      this._departures = payload
      this.hasLoaded = true
      // Update dom with given animation speed
      this.updateDom(animationSpeed)
    } else if (notification == 'ERROR') {
      // TODO: Update front-end to display specific error.
    }
  }
})
