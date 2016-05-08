var express = require('express');
var fs = require('fs');
var https = require('https');
var request = require('request');
var moment = require('moment-timezone');
var app = express();

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

// Add headers
app.use(function(req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', 'https://compose.mixmax.com');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});

var GoogleLocations = require('google-locations');
var locations = new GoogleLocations('AIzaSyBBxyDwTMxzB40JWvxiHDGH7rlIOoE5eU4');

app.get('/search', function(req, res) {
  var cityObject = new Array()
  res.setHeader('Content-Type', 'application/json');
  locations.autocomplete({ input: req.param('text'), types: "(cities)" }, function(err, response) {
    if (response.predictions.length == 0) {
      res.json([{
        title: '<i>(Enter attendee\'s city name)</i>',
        text: ''
      }]);
    } else {
      res.write(JSON.stringify(response.predictions.map(function(response) {
        return {
          title: response.description,
          text: response.description
        };
      })))
    }
    res.end();
  });
})

app.get('/calendar', function(req, res) {
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

var options = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt')
};

https.createServer(options, app).listen(3000, function() {
  console.log('Started!');
})
