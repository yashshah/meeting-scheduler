module.exports = function(req, res) {
  req.session.preferences = req.body
  res.send('Saved!');
}
