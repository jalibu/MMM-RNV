/*! *****************************************************************************
  mmm-rnv
  Version 1.0.1

  This module for the MagicMirror² platform monitors a given station in the RNV traffic network.

  (c) Julian Dinter,Jan Litzenburger
  Licence: MIT

  This file is auto-generated. Do not edit.
***************************************************************************** */

!function(){"use strict";class t{constructor(t){this.config=t}getTypeIcon(t){return this.config.icons[t]||"fas fa-bus"}getLineColorStyle(t){return t&&this.config.showLineColors?`background: ${t.primary.hex}; color: ${t.contrast.hex}; padding: 5px;`:""}}Module.register("MMM-RNV",{defaults:{animationSpeedMs:2e3,updateIntervalMs:6e4,stationId:"2417",showLineColors:!0,maxResults:10,credentials:null,clientApiUrl:"https://graphql-sandbox-dds.rnv-online.de",timeformat:"HH:mm",showPlatform:!1,showTableHeadersAsSymbols:!1,highlightLines:[],excludeLines:[],icons:{STRASSENBAHN:"fas fa-train",STADTBUS:"fas fa-bus"}},start(){Log.info("Starting module: "+this.name),this.hasLoaded=!1,this._departures=null,this._errors=null;const t=this.config.credentials;(null==t?void 0:t.apiKey)||(null==t?void 0:t.clientId)&&(null==t?void 0:t.clientSecret)&&(null==t?void 0:t.tenantId)&&(null==t?void 0:t.resourceId)?(t.oAuthUrl=`https://login.microsoftonline.com/${t.tenantId}/oauth2/token`,this.sendSocketNotification("RNV_CONFIG_REQUEST",this.config)):this._errors={type:"ERROR",message:"No API credentials provided"}},getStyles:()=>["MMM-RNV.css","font-awesome.css"],getScripts:()=>["moment.js"],getTranslations:()=>({de:"translations/de.json"}),getTemplate:()=>"templates/MMM-RNV.njk",getTemplateData(){const e=new t(this.config);return{departures:this._departures,config:this.config,errors:this._errors,utils:e,moment:moment}},socketNotificationReceived(t,e){"RNV_DATA_RESPONSE"==t?(console.log("Departures",e),this._departures=e,this._errors=null,this.hasLoaded=!0,this.updateDom(this.hasLoaded?0:this.config.animationSpeedMs)):"RNV_ERROR_RESPONSE"==t&&(console.log("gut",e),this._errors=e,this.updateDom(0))}})}();
