var express = require('express');
var fs = require('fs');
var https = require('https');
var cors = require('cors');
var app = express();

// Since Mixmax calls this API directly from the client-side, it must be whitelisted.
var corsOptions = {
  origin: /^[^.\s]+\.mixmax\.com$/,
  credentials: true
};

app.get('/search', cors(corsOptions), require('./api/search'))
app.get('/scheduler', cors(corsOptions), require('./api/scheduler'))
app.get('/login', cors(corsOptions), require('./api/login'))
app.get('/', cors(corsOptions), require('./api/auth'))

var options = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt')
};

https.createServer(options, app).listen(3000, function() {
  console.log('Server started!');
})
