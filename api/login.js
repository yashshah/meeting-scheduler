var google = require('../common/google');
var appbase = require('../common/appbase');
var jwt = require('jsonwebtoken');
var secret = require('../config').app.secret;

module.exports = function(req, res) {
  var code = req.query.code;
  google.oauth2Client.getToken(code, function(err, tokens) {

    if (!err) {
      updateAccessToken(tokens, res);
      var jwtToken = jwt.sign(tokens, secret, {
        expiresIn: '7d' // expires in 24 hours
      });
      req.session.loginToken = jwtToken
    } else {
      res.send('Error getting token', err);
      console.log('Error getting token', err);
    }
  });
};

function updateAccessToken(tokens, response) {
  var requestObject = {
    type: appbase.config.type,
    id: 'X1',
    body: tokens
  };
  appbase.ref.index(requestObject).on('data', function(res) {
    response.redirect('/dashboard')
  }).on('error', function(error) {
    console.log('error updating table');
    console.log(error);
    response.send('Error occured, please try again');
  });

}
