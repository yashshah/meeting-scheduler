var express = require('express');
var app = express();
var fs = require('fs');
var https = require('https');
var request = require('request');
var moment = require('moment-timezone');

var jun = moment.tz("22:00", 'HH', "Asia/Kolkata").tz("Europe/Berlin").format('HH:mm a');
console.log(jun)

var end = moment(new Date(end)).format('HH:mm');
const CAL_PREFER_TIME_START = 2
const CAL_PREFER_TIME_END = 16
const USER_TIMEZONE = "Asia/Kolkata"
const NUMBER_OF_TIME_SLOT_REQUIRED = 3

const CLIENT_PREFER_TIME_START = 10
const CLIENT_PREFER_TIME_END = 21

var preferedTimeHash = {}; // New object
for (i = 0; i < 24; i++) {
  if (i >= CAL_PREFER_TIME_START && i <= CAL_PREFER_TIME_END && i >= CLIENT_PREFER_TIME_START && i <= CLIENT_PREFER_TIME_END) {
    preferedTimeHash[i] = 1
  } else
    preferedTimeHash[i] = 0
}
preferedTimeHash[2] = 1
suggestTime(preferedTimeHash)

function suggestTime(preferedTimeHash) {
  var minList = [00, 15, 30, 45]
  var tempList = []
  for (hour in preferedTimeHash) {
    if (preferedTimeHash[hour] > 0)
      tempList.push([parseInt(hour), preferedTimeHash[hour]])
  }
  var suggestTime = []

  hourListLength = tempList.length

  for (i = 0; i < NUMBER_OF_TIME_SLOT_REQUIRED; i++) {
    slot = (hourListLength / NUMBER_OF_TIME_SLOT_REQUIRED)
    min = Math.round(i * slot)
    max = Math.min(Math.round((i + 1) * slot), hourListLength)
    list = tempList.slice(min, max).sort(function(a, b) {
      return a[1] - b[1]
    })
    suggestTime.push(list[Math.floor(Math.random() * list.length)][0])
  }
  console.log(suggestTime)
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
    res.write(JSON.stringify(response.predictions.map(function(response) {
      return { title: response.description };
    })))
    res.end();
  });
})

app.get('/calendar', function(req, res) {
  locations.autocomplete({ input: req.param('text'), types: "(cities)" }, function(err, response) {
    locations.details({ placeid: response.predictions[0].place_id }, function(err, response) {
      request('https://api.timezonedb.com/?lat=' + response.result.geometry.location.lat + '&lng=' + response.result.geometry.location.lng + '&key=I16KGCYBRXQ8&format=json', function(error, response, body) {
        if (!error && response.statusCode == 200) {
          console.log(body); // Show the HTML for the Modulus homepage.
        }
      });
    });
  });
  res.write(JSON.stringify({ body: 0 }))
})

var options = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt')
};

https.createServer(options, app).listen(3000, function() {
  console.log('Started!');
})
