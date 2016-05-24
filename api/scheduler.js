var request = require('request');
var moment = require('moment-timezone');
var GoogleLocations = require('google-locations');
var google = require('../common/google');
var appbase = require('../common/appbase');
var helper = require('../common/helper');

var locations = new GoogleLocations('AIzaSyBBxyDwTMxzB40JWvxiHDGH7rlIOoE5eU4');

// The API that returns the in-email representation.
module.exports = function(req, res) {
  var feasibleTimeSlots;
  // Get the latitue and longitude for the city user selected
  locations.autocomplete({ input: req.param('text'), types: "(cities)" }, function(err, response) {
    locations.details({ placeid: response.predictions[0].place_id }, function(err, response) {
      // Get the timezone of the attendee
      request('https://api.timezonedb.com/?lat=' + response.result.geometry.location.lat + '&lng=' + response.result.geometry.location.lng + '&key=I16KGCYBRXQ8&format=json', function(error, response, body) {
        if (!error && response.statusCode == 200) {

          var config = {
            "slots_required_number": "3",
            "dates_required_number": "4"
          }

          var user = {
            "timezone": "America/Los_Angeles",
            "available_time_start": "08:00",
            "available_time_end": "21:00",
            "busy_slots": []
          }

          var attendee = {
            "timezone": "America/Los_Angeles",
            "available_time_start": "08:00",
            "available_time_end": "21:00",
            "busy_slots": []
          }

          attendee.timezone = JSON.parse(body).zoneName

          var tokens = req.decoded
          google.oauth2Client.setCredentials({
            'access_token': tokens.access_token,
            'refresh_token': tokens.refresh_token
          });

          var userStartDate = moment.tz(user.available_time_start, 'HH:mm', user.timezone).add(1, "days")
          var userEndDate = moment.tz(user.available_time_end, 'HH:mm', user.timezone).add(config.dates_required_number, "days")
            // Get the events from the google calendar
          google.calendar.events.list({
            auth: google.oauth2Client,
            calendarId: 'primary',
            timeMin: userStartDate.format(),
            timeMax: userEndDate.format(),
            maxResults: 250,
            singleEvents: true,
            orderBy: 'startTime'
          }, function(err, response) {
            if (err) {
              console.log('The API returned an error: ' + err);
            }
            if (response) {
              user.busy_slots = response.items;
              helper.sendBestTimeSlots(res, user, attendee, config)
            } else {
              res.json({
                body: 'Please sign up at <a href="http://104.131.165.92:3000">http://104.131.165.92:3000</a>',
                raw: true
              })
            }
          });
        }
      });
    });
  });
}