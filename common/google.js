var google_config = require('../config').google;

var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(google_config.client_id, google_config.client_secret, google_config.redirect_uri);
var calendar = google.calendar('v3');

exports.oauth2Client = oauth2Client; 
exports.calendar = calendar;
exports.config = google_config;