/*! *****************************************************************************
  mmm-rnv
  Version 1.0.0

  

  (c) Julian Dinter
  Licence: ISC

  This file is auto-generated. Do not edit.
***************************************************************************** */

!function(){"use strict";class t{constructor(t){this.config=t}getTypeIcon(t){return this.config.icons[t]||"fas fa-bus"}getLineColorStyle(t){return t&&this.config.showLineColors?`background: ${t.primary.hex}; color: ${t.contrast.hex}; padding: 5px;`:""}}Module.register("MMM-RNV",{defaults:{animationSpeedMs:2e3,updateIntervalMs:1e4,stationId:"2417",showLineColors:!0,maxResults:10,apiKey:null,clientId:null,resourceId:null,clientSecret:null,oAuthUrl:null,tenantId:null,clientApiUrl:"https://graphql-sandbox-dds.rnv-online.de",timeformat:"HH:mm",showPlatform:!1,showTableHeadersAsSymbols:!1,icons:{STRASSENBAHN:"fas fa-train",STADTBUS:"fas fa-bus"}},start(){Log.info("Starting module: "+this.name),this.hasLoaded=!1,this.credentials=!1,this._departures=null,(this.config.apiKey||this.config.clientId&&this.config.clientSecret&&this.config.tenantId&&this.config.resourceId)&&(this.credentials=!0,this.config.oAuthUrl=`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/token`,this.sendSocketNotification("SET_CONFIG",this.config))},getStyles:()=>["MMM-RNV.css","font-awesome.css"],getScripts:()=>["moment.js"],getTranslations:()=>({de:"translations/de.json"}),getTemplate:()=>"templates/MMM-RNV.njk",getTemplateData(){const e=new t(this.config);return{departures:this._departures,config:this.config,utils:e,moment:moment}},socketNotificationReceived(t,e){"DATA"==t&&(console.log("Departures",e),this._departures=e,this.hasLoaded=!0,this.updateDom(this.hasLoaded?0:this.config.animationSpeedMs))}})}();
