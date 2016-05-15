var google = require('../common/google');
var appbase = require('../common/appbase');


module.exports = function(req, res) {
  var code = req.query.code;
  google.oauth2Client.getToken(code, function(err, tokens) {

    if (!err) {
      updateAccessToken(tokens, res);
      // req.session.loginToken = tokens

    } else {
      res.send('Error getting token');
      console.log('Error getting token');
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
    response.send('connected!');
  }).on('error', function(error) {
    console.log('error updating table');
    console.log(error);
    response.send('Error occured, please try again');
  });

}
