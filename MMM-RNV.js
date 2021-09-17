/*! *****************************************************************************
  mmm-rnv
  Version 1.0.2

  This is a departure monitor for the Rhein-Neckar-Verkehr (RNV) public transport network for the MagicMirror² platform. 
  Please submit bugs at https://github.com/jalibu/MMM-RNV/issues

  (c) Julian Dinter,Jan Litzenburger
  Licence: MIT

  This file is auto-generated. Do not edit.
***************************************************************************** */

!function(){"use strict";class e{constructor(e){this.config=e}getTypeIcon(e){return this.config.icons[e]||"fas fa-bus"}getLineColorStyle(e){return e&&this.config.showLineColors?`background: ${e.primary.hex}; color: ${e.contrast.hex}; padding: 5px;`:""}}Module.register("MMM-RNV",{defaults:{animationSpeedMs:2e3,updateIntervalMs:6e4,stationId:"2417",showLineColors:!0,maxResults:10,credentials:null,clientApiUrl:"https://graphql-sandbox-dds.rnv-online.de",timeformat:"HH:mm",showPlatform:!1,showTableHeadersAsSymbols:!1,highlightLines:[],excludeLines:[],icons:{STRASSENBAHN:"fas fa-train",STADTBUS:"fas fa-bus"}},start(){Log.info("Starting module: "+this.name),this.hasLoaded=!1,this._departures=null,this._errors=null;const e=this.config.credentials;(null==e?void 0:e.clientId)&&(null==e?void 0:e.clientSecret)&&(null==e?void 0:e.tenantId)&&(null==e?void 0:e.resourceId)?this.sendSocketNotification("RNV_CONFIG_REQUEST",this.config):this._errors={type:"ERROR",message:"No API credentials provided"}},getStyles:()=>["MMM-RNV.css","font-awesome.css"],getScripts:()=>["moment.js"],getTranslations:()=>({de:"translations/de.json"}),getTemplate:()=>"templates/MMM-RNV.njk",getTemplateData(){const t=new e(this.config);return{departures:this._departures,config:this.config,errors:this._errors,utils:t,moment:moment}},socketNotificationReceived(e,t){"RNV_DATA_RESPONSE"==e?(console.log("Departures",t),this._departures=t,this._errors=null,this.hasLoaded=!0,this.updateDom(this.hasLoaded?0:this.config.animationSpeedMs)):"RNV_ERROR_RESPONSE"==e&&(console.log("gut",t),this._errors=t,this.updateDom(0))}})}();
