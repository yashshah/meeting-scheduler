var config = require('../config').appbase;
var Appbase = require('appbase-js');

var appbaseRef = new Appbase({
  url: 'https://scalr.api.appbase.io',
  appname: config.appname,
  username: config.username,
  password: config.password
});

exports.ref = appbaseRef
exports.config = config;
