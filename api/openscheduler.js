var helper = require('../common/helper');

module.exports = function(req, res) {

  var config = {
    "slots_required_number": "3",
    "dates_required_number": "4"
  }

  var user = {
    "timezone": "America/Los_Angeles",
    "available_time_start": "08:00",
    "available_time_end": "22:00",
    "busy_slots": []
  }

  var attendee = {
    "timezone": "America/Los_Angeles",
    "available_time_start": "08:00",
    "available_time_end": "22:00",
    "busy_slots": []
  }

  attendee.timezone = req.param('attendeeTimezone')
  user.timezone = req.param('userTimezone')
  helper.sendBestTimeSlots(res, user, attendee, config)

}
