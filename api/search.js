var GoogleLocations = require('google-locations');
var locations = new GoogleLocations('AIzaSyBBxyDwTMxzB40JWvxiHDGH7rlIOoE5eU4');

module.exports = function(req, res) {
  // Get the list of cities that matches our input
  locations.autocomplete({ input: req.param('text'), types: "(cities)" }, function(err, response) {
    // If there are no autocomplete results
    if (response.predictions.length == 0) {
      res.json([{
        title: '<i>(Enter attendee\'s city name)</i>',
        text: ''
      }]);
    } else {
      // Send the cities autocomplete list to Mixmax
      res.json(response.predictions.map(function(response) {
        return {
          title: response.description,
          text: response.description
        };
      }))
    }
  });
}
