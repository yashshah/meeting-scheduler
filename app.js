var express = require('express');
var app = express();
var fs = require('fs');
var https = require('https');
var request = require('request');

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
      console.log(response.result.geometry.location.lat)
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
