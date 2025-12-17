/*! *****************************************************************************
  mmm-rnv
  Version 1.2.0

  This is a departure monitor for the Rhein-Neckar-Verkehr (RNV) public transport network for the MagicMirror² platform.
  Please submit bugs at https://github.com/jalibu/MMM-RNV/issues

  (c) Julian Dinter,Jan Litzenburger
  Licence: MIT

  This file is auto-generated. Do not edit.
***************************************************************************** */

!function(){"use strict";class t{constructor(t){this.config=t}getTypeIcon(t){return this.config.icons[t]||"fas fa-bus"}getLineColorStyle(t){return t&&this.config.showLineColors?`background: ${t.primary.hex}; color: ${t.contrast.hex}; padding: 5px;`:""}}Module.register("MMM-RNV",{defaults:{animationSpeedMs:2e3,updateIntervalMs:6e4,walkingTimeMs:18e4,stationId:"2417",showLineColors:!0,maxResults:10,credentials:null,clientApiUrl:"https://graphql-sandbox-dds.rnv-online.de",timeformat:"HH:mm",showPlatform:!1,showTableHeadersAsSymbols:!1,highlightLines:[],excludeLines:[],excludePlatforms:[],icons:{STRASSENBAHN:"fas fa-train",STADTBUS:"fas fa-bus"}},start(){Log.info(`Starting module: ${this.name}`),this.hasLoaded=!1,this.departures=null,this.errors=null;const{credentials:t}=this.config;(null==t?void 0:t.clientId)&&(null==t?void 0:t.clientSecret)&&(null==t?void 0:t.tenantId)&&(null==t?void 0:t.resourceId)?(this.getData(),setInterval((()=>{this.getData()}),this.config.updateIntervalMs)):this.errors={type:"ERROR",message:"No API credentials provided"}},getData(){this.sendSocketNotification("RNV_DEPARTURE_REQUEST",this.config)},getStyles:()=>["MMM-RNV.css","font-awesome.css"],getScripts:()=>["moment.js"],getTranslations:()=>({de:"translations/de.json"}),getTemplate:()=>"templates/MMM-RNV.njk",getTemplateData(){const e=new t(this.config);return{departures:this.departures,config:this.config,errors:this.errors,utils:e,moment:moment}},socketNotificationReceived(t,e){t===`RNV_DATA_RESPONSE_${this.config.stationId}`?(Log.log("Departures",e),this.departures=e,this.errors=null,this.hasLoaded=!0,this.updateDom(this.hasLoaded?0:this.config.animationSpeedMs)):"RNV_ERROR_RESPONSE"===t&&(Log.warn(e),this.errors=e,this.updateDom(0))}})}();
