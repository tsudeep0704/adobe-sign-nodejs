module.exports = {
   "table_name_agency_store" : "AgencyStore",    // This is a table name of Amazon DynamoDB which needs to be created manually before aws lambda running
   "adobe_client_id" : "CBJCHBCAABAA_pe00xJAQ5-75mA4CdXCvv40klYUBRjZ",             // get it from adobe esign developer site - https://secure.na1.echosign.com/account/accountSettingsPage#pageId::API_APPLICATIONS
   "adobe_client_secret" : "krsKj31lsdWD9lgqe9Xnx-DnyvoAuo5b",         // get it from adobe esign developer site - https://secure.na1.echosign.com/account/accountSettingsPage#pageId::API_APPLICATIONS
   "adobe_refresh_token_scopes" : "agreement_send:account agreement_read:account agreement_write:account", // No need to change
   "adobe_auth_api_endpoint" : "https://api.echosign.com/oauth/refresh",   // Don't change it
   "adobe_api_endpoint_base" : "https://api.na1.echosign.com/api/rest/v5", // Don't change it
   "construct_api_hostname" : "apis.accela.com",                           // production: apis.accela.com, stage: apis.dev.accela.com
   "construct_api_protocol" : "https:",                     // Don't change it
   "construct_client_id" : "636322784822550518",         // get it from accela construct developer site, production: https://developer.accela.com, stage: https://developer.dev.accela.com
   "construct_client_secret" : "0fab0a5dcc9d4a619aec3f58cafe572a",      // get it from accela construct developer site, production: https://developer.accela.com, stage: https://developer.dev.accela.com
   "crypt_private_key":"w@Lr!s2P"       // 8 bytes chars, need to keep same value as in tools, you can leave it as defalt value.
}