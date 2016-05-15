var google = require('../common/google');

module.exports = function(req, res) {
  var url = google.oauth2Client.generateAuthUrl({
    access_type: google.config.access_type,
    scope: google.config.scopes
  });
  res.send('<a href="' + url + '">Login to Google</a>');
};
