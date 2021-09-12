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
    this.fetchedData = null

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

  // Override dom generator.
  getDom() {
    const wrapper = document.createElement('div')

    if (!this.credentials) {
      wrapper.innerHTML = 'There are no <i>RNV Credentials</i> in config file set.'
      wrapper.className = 'light small dimmed'
      return wrapper
    }
    if (this.config.stationID == '') {
      wrapper.innerHTML = 'No <i>stationID</i> in config file set.'
      wrapper.className = 'light small dimmed'
      return wrapper
    }
    if (!this.hasLoaded) {
      wrapper.innerHTML = 'Loading...'
      wrapper.className = 'light small dimmed'
      return wrapper
    }

    if (this.hasLoaded && this.fetchedData.length == 0) {
      wrapper.innerHTML = 'No data available'
      wrapper.className = 'light small dimmed'
      return wrapper
    }

    // Create dom table
    const table = document.createElement('table')
    table.className = 'MMM-RNV light small'
    table.id = 'RNVTable'

    const tableHead = document.createElement('tr')

    const tableHeadTime = document.createElement('th')
    tableHeadTime.innerHTML = this.translate('DEPARTURE')
    tableHeadTime.className = 'MMM-RNV header departure'

    const tableHeadLine = document.createElement('th')
    tableHeadLine.innerHTML = this.translate('LINE')
    tableHeadLine.className = 'MMM-RNV line'
    tableHeadLine.colSpan = 2

    const tableHeadDestination = document.createElement('th')
    tableHeadDestination.innerHTML = this.translate('DIRECTION')
    tableHeadDestination.className = 'MMM-RNV direction'

    const tableHeadPlatform = document.createElement('th')
    tableHeadPlatform.innerHTML = this.translate('PLATFORM')
    tableHeadPlatform.className = 'MMM-RNV platform'

    tableHead.appendChild(tableHeadTime)
    tableHead.appendChild(tableHeadLine)
    tableHead.appendChild(tableHeadDestination)
    tableHead.appendChild(tableHeadPlatform)

    table.appendChild(tableHead)

    // Horizontal rule after table header
    const hruleRow = document.createElement('tr')
    const hruleData = document.createElement('td')
    hruleData.colSpan = 5
    hruleData.innerHTML = '<hr>'

    hruleRow.appendChild(hruleData)
    table.appendChild(hruleRow)

    const numDepartures = this.fetchedData.length
    // Iterating over received data
    for (let i = 0; i < numDepartures; i++) {
      let currentDeparture = this.fetchedData[i]
      let line = currentDeparture.line.id.split('-')[1]
      let type = currentDeparture.type

      let destination = currentDeparture.stops[0].destinationLabel
      let platform = currentDeparture.stops[0].pole.platform.label
      let delay = currentDeparture.stops[0].delay

      let departureTimes = currentDeparture.stops[0]
      let plannedDepartureIsoString = departureTimes.plannedDeparture.isoString
      let plannedDepartureDate = new Date(plannedDepartureIsoString)
      let plannedDeparture = plannedDepartureDate.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })

      // Time
      let dataCellTime = document.createElement('td')
      dataCellTime.className = 'MMM-RNV data time'
      dataCellTime.innerHTML = plannedDeparture

      // -- Delay
      let dataCellTimeDelay = document.createElement('span')
      dataCellTimeDelay.className = 'MMM-RNV small delay'
      if (delay > 0) {
        dataCellTimeDelay.innerHTML = '+ ' + delay
        dataCellTimeDelay.classList.add('late')
      } else if (delay < 0) {
        dataCellTimeDelay.innerHTML = '- ' + delay
        dataCellTimeDelay.classList.add('early')
      } else {
        dataCellTimeDelay.innerHTML = '+ ' + delay
        dataCellTimeDelay.style.visibility = 'hidden'
      }

      dataCellTime.appendChild(dataCellTimeDelay)

      // Line
      let dataCellLine = document.createElement('td')
      dataCellLine.className = 'MMM-RNV data line'
      dataCellLine.innerHTML = line

      // -- Span
      let dataCellLineSpan = document.createElement('span')
      dataCellLineSpan.className = 'MMM-RNV data time icon'
      // ---- Icon
      let dataCellLineIcon = document.createElement('i')
      dataCellLineIcon.className = this.config.icon[type]
      dataCellLineSpan.appendChild(dataCellLineIcon)

      // Direction
      let dataCellDirection = document.createElement('td')
      dataCellDirection.className = 'MMM-RNV data direction'
      dataCellDirection.innerHTML = destination

      // Platform
      let dataCellPlatform = document.createElement('td')
      dataCellPlatform.className = 'MMM-RNV data platform'
      dataCellPlatform.innerHTML = platform

      let dataRow = document.createElement('tr')
      dataRow.appendChild(dataCellTime)
      dataRow.appendChild(dataCellLine)
      dataRow.appendChild(dataCellLineSpan)
      dataRow.appendChild(dataCellDirection)
      dataRow.appendChild(dataCellPlatform)

      table.appendChild(dataRow)
    }
    wrapper.appendChild(table)

    // Return the wrapper to the dom.
    return wrapper
  },

  // Override socket notification handler.
  socketNotificationReceived(notification, payload) {
    if (notification == 'DATA') {
      let animationSpeed = this.config.animationSpeed
      if (this.hasLoaded) {
        animationSpeed = 0
      }
      this.fetchedData = payload
      this.hasLoaded = true
      // Update dom with given animation speed
      this.updateDom(animationSpeed)
    } else if (notification == 'ERROR') {
      // TODO: Update front-end to display specific error.
    }
  }
})
