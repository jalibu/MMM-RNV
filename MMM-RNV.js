/*! *****************************************************************************
  mmm-rnv
  Version 1.0.0

  

  (c) Julian Dinter
  Licence: ISC

  This file is auto-generated. Do not edit.
***************************************************************************** */

!function(){"use strict";Module.register("MMM-RNV",{defaults:{animationSpeed:2e3,updateInterval:6e4,stationID:"2417",numJourneys:10,apiKey:"",clientID:"",resourceID:"",clientSecret:"",oAuthURL:"",tenantID:"",clientAPIURL:"https://graphql-sandbox-dds.rnv-online.de",icon:{STRASSENBAHN:"fas fa-train",STADTBUS:"fas fa-bus"}},start(){Log.info("Starting module: "+this.name),this.hasLoaded=!1,this.credentials=!1,this._departures=null,(this.config.apiKey||this.config.clientID&&this.config.clientSecret&&this.config.tenantID&&this.config.resourceID)&&(this.credentials=!0,this.config.oAuthURL=`https://login.microsoftonline.com/${this.config.tenantID}/oauth2/token`,this.sendSocketNotification("SET_CONFIG",this.config))},getStyles:()=>["MMM-RNV.css","font-awesome.css"],getTranslations:()=>({de:"translations/de.json"}),getTemplate:()=>"templates/MMM-RNV.njk",getTemplateData(){return{departures:this._departures}},socketNotificationReceived(t,e){"DATA"==t&&(console.log("Departures",e),this._departures=e,this.hasLoaded=!0,this.updateDom(this.hasLoaded?0:this.config.animationSpeed))}})}();
