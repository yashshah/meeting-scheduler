var express = require('express');
var fs = require('fs');
var https = require('https');
var cors = require('cors');
var app = express();
var cookieSession = require('cookie-session');
// Since Mixmax calls this API directly from the client-side, it must be whitelisted.
var corsOptions = {
  origin: /^[^.\s]+\.mixmax\.com$/,
  credentials: true
};

app.use(cookieSession({
    secret: secret,
    name: 'session'
}));

app.use(express.static(__dirname + '/public'));
app.get('/login', cors(corsOptions), require('./api/login'))
app.get('/search', cors(corsOptions), require('./api/search'))
app.get('/slots', cors(corsOptions), require('./api/openscheduler'))
app.use(require('./common/authMiddleware.js'))
app.get('/scheduler', cors(corsOptions), require('./api/scheduler'))
app.use('/dashboard', express.static(__dirname + '/public/dashboard.html'));
var options = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt')
};

https.createServer(options, app).listen(3000, function() {
  console.log('Server started!');
})
