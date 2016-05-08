var express = require('express');
var fs = require('fs');
var https = require('https');
var request = require('request');
var moment = require('moment-timezone');
var cors = require('cors');
var app = express();

// Since Mixmax calls this API directly from the client-side, it must be whitelisted.
var corsOptions = {
  origin: /^[^.\s]+\.mixmax\.com$/,
  credentials: true
};

const USER_TIMEZONE = "Asia/Kolkata"
const NUMBER_OF_TIME_SLOTS_REQUIRED = 3
const CAL_AVAILIBILITY_TIME_START = moment.tz("08:00", 'HH:mm', USER_TIMEZONE);
const CAL_AVAILIBILITY_TIME_END = moment.tz("22:00", 'HH:mm', USER_TIMEZONE);

function calculatePreferedTime(attendeeTimeZone) {
  var preferedTimeHash = {}; // New object
  var userAvailabilityInHours = moment.duration(CAL_AVAILIBILITY_TIME_END.diff(CAL_AVAILIBILITY_TIME_START)).asHours()
  var attendeeAvailibilityTimeStart = moment.tz("08:00", 'HH:mm', attendeeTimeZone);
  var attendeeAvailibilityTimeEnd = moment.tz("22:00", 'HH:mm', attendeeTimeZone);
  var userTimeInAttendeeTimeZone = CAL_AVAILIBILITY_TIME_START.clone().tz(attendeeTimeZone)
  for (i = 0; i < userAvailabilityInHours * 2; i++) {
    if (userTimeInAttendeeTimeZone.format('HHmm') >= attendeeAvailibilityTimeStart.format('HHmm') && userTimeInAttendeeTimeZone.format('HHmm') <= attendeeAvailibilityTimeEnd.format('HHmm')) {
      preferedTimeHash[userTimeInAttendeeTimeZone.format('HH:mm z')] = 1
    }
    userTimeInAttendeeTimeZone = userTimeInAttendeeTimeZone.add(30, "minutes")
  }
  return suggestTime(preferedTimeHash)
}


function suggestTime(preferedTimeHash) {
  var minList = [00, 15, 30, 45]
  var timeSuggestions = []
  var timeSlots = []
  for (slot in preferedTimeHash) {
    timeSlots.push([slot, preferedTimeHash[slot]])
  }
  timeSlotsLength = timeSlots.length

  for (i = 0; i < NUMBER_OF_TIME_SLOTS_REQUIRED; i++) {
    slot = (timeSlotsLength / NUMBER_OF_TIME_SLOTS_REQUIRED)
    min = Math.round(i * slot)
    max = Math.min(Math.round((i + 1) * slot), timeSlotsLength)
    list = timeSlots.slice(min, max).sort(function(a, b) {
      return a[1] - b[1]
    })
    timeSuggestions.push(list[Math.floor(Math.random() * list.length)][0])
  }
  return timeSuggestions;
}

var GoogleLocations = require('google-locations');
var locations = new GoogleLocations('AIzaSyBBxyDwTMxzB40JWvxiHDGH7rlIOoE5eU4');


app.get('/calendar', cors(corsOptions), function(req, res) {
  var suggestedTimeSlots;
  locations.autocomplete({ input: req.param('text'), types: "(cities)" }, function(err, response) {
    locations.details({ placeid: response.predictions[0].place_id }, function(err, response) {
      request('https://api.timezonedb.com/?lat=' + response.result.geometry.location.lat + '&lng=' + response.result.geometry.location.lng + '&key=I16KGCYBRXQ8&format=json', function(error, response, body) {
        if (!error && response.statusCode == 200) {
          console.log("Time zone is ", JSON.parse(body).zoneName)
          suggestedTimeSlots = calculatePreferedTime(JSON.parse(body).zoneName)
          var html = "Let me know which time works for you: " + suggestedTimeSlots.map(function(response) {
            return " " + response
          })
          res.json({
            body: html,
            subject: "subject",
            raw: "raw"
          })
          console.log("Here are my suggestions: ", suggestedTimeSlots)
        }
      });
    });
  });
  console.log(suggestedTimeSlots)
})
app.get('/search', cors(corsOptions), require('./api/search'))

var options = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt')
};

https.createServer(options, app).listen(3000, function() {
  console.log('Started!');
})
