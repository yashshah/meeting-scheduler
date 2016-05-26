module.exports = function(req, res) {
  req.session.preferences = req.body
  res.end('{"success" : "Updated Successfully", "status" : 200}');
}
