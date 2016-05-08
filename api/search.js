var GoogleLocations = require('google-locations');
var locations = new GoogleLocations('AIzaSyBBxyDwTMxzB40JWvxiHDGH7rlIOoE5eU4');

module.exports = function(req, res) {
  locations.autocomplete({ input: req.param('text'), types: "(cities)" }, function(err, response) {
    if (response.predictions.length == 0) {
      res.json([{
        title: '<i>(Enter attendee\'s city name)</i>',
        text: ''
      }]);
    } else {
      res.json(response.predictions.map(function(response) {
        return {
          title: response.description,
          text: response.description
        };
      }))
    }
  });
}
