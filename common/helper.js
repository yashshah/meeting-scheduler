var moment = require('moment-timezone');

require('moment-range');

module.exports.sendBestTimeSlots = function(res, user, attendee, config) {

  var userRequestDate = moment.tz(user.available_time_start, 'HH:mm', user.timezone).add(1, "days")
  var userRequestDateEnd = moment.tz(user.available_time_end, 'HH:mm', user.timezone).add(1, "days")
  var time_start = moment.tz(user.available_time_start, 'HH:mm', user.timezone);
  var time_end = moment.tz(user.available_time_end, 'HH:mm', user.timezone);
  var userAvailabilityInHours = moment.duration(time_end.diff(time_start)).asHours();
  // Using Mixmax SDK for displaying the slots in the Mixmax
  var html = "Let me know which time works for you in " + moment.tz(attendee.timezone).format('z') + ": </br>";
  // Get feasiable time slots for preferred number of dates
  for (var k = 0; k < config.dates_required_number; k++) {
    var busy_slots = [];
    var timeRange = moment.range(userRequestDate, userRequestDateEnd)
    for (var j = 0; j < user.busy_slots.length; j++) {
      var event = user.busy_slots[j];
      var start = event.start.dateTime || event.start.date;
      var end = event.end.dateTime || event.end.date;
      var range = moment.range(start, end);
      if (timeRange.overlaps(range)) {
        busy_slots.push(event)
        user.busy_slots.splice(j, 1)
      }
    }

    // Get the feasiable time slots in the attendee's timezone
    feasibleTimeSlots = getFeasibleTimeSlots(attendee, config, userRequestDate, userAvailabilityInHours, busy_slots);
    if (feasibleTimeSlots.length) {
      feasibleTimeSlots.sort(function(a, b) {
        return new Date('1970/01/01 ' + a) - new Date('1970/01/01 ' + b);
      });
      html = html + userRequestDate.format('ddd, MMM Do') + ': ' + feasibleTimeSlots.map(function(response) {
        return " " + response;
      }) + "</br>"
    } else {
      html = html + userRequestDate.format('ddd, MMM Do') + ': No Available slots</br>'
    }
    userRequestDate = userRequestDate.add(1, "days")
    userRequestDateEnd = userRequestDateEnd.add(1, "days")
  }
  res.json({
    body: html,
    raw: true
  })
}

// Given the timezone, get the most feasiable time slots
function getFeasibleTimeSlots(attendee, config, userRequestDate, userAvailabilityInHours, busySlots) {
  var feasibleHours = {}; // New object
  var attendeeAvailibilityStartTime = moment.tz(attendee.available_time_start, 'HH:mm', attendee.timezone);
  var attendeeAvailibilityEndTime = moment.tz(attendee.available_time_end, 'HH:mm', attendee.timezone);

  var userTimeInAttendeeTimeZone = userRequestDate.clone().tz(attendee.timezone);
  // Loop through all the time slots where user is available and if it belongs to Attendee workable hours
  for (var i = 0; i < userAvailabilityInHours * 2; i++) {
    if (userTimeInAttendeeTimeZone.format('HHmm') >= attendeeAvailibilityStartTime.format('HHmm') && userTimeInAttendeeTimeZone.format('HHmm') <= attendeeAvailibilityEndTime.format('HHmm')) {
      var slotFreeFlag = 1;
      for (var j = 0; j < busySlots.length; j++) {
        var event = busySlots[j];
        // var event_id = event.id;
        // var summary = event.summary;
        var start = event.start.dateTime || event.start.date;
        var end = event.end.dateTime || event.end.date;
        var range = moment.range(start, end);
        if (range.contains(userTimeInAttendeeTimeZone)) {
          console.log(start, end, userTimeInAttendeeTimeZone.format(), range.contains(userTimeInAttendeeTimeZone))
          slotFreeFlag = 0
            // console.log("Removed: ", userTimeInAttendeeTimeZone.format('HH:mm'))
          break;
        }
      }
      if (slotFreeFlag) {
        feasibleHours[userTimeInAttendeeTimeZone.format('hh:mm a')] = 1;
      }
    }
    // Increasing the time by 30 minutes in each iteration
    userTimeInAttendeeTimeZone = userTimeInAttendeeTimeZone.add(30, "minutes");
  }
  // console.log(feasibleHours)
  return suggestBestTimeSlots(feasibleHours, config);
}

// Given the feasiable hours, suggest the one that will work the best for attendee
function suggestBestTimeSlots(feasibleHours, config) {
  // var minList = [00, 15, 30, 45]
  var feasibleSlots = [];
  var feasibleHoursArray = [];

  // Check if feasible hours are less than slots required, then print them as it is
  if (feasibleHours.length <= config.slots_required_number) {
    for (hour in feasibleHours) {
      feasibleSlots.push(hour);
    }
    return feasibleHoursArray;
  }
  // Converting the feasiableHours object into an array
  for (hour in feasibleHours) {
    feasibleHoursArray.push([hour, feasibleHours[hour]]);
  }
  feasibleHoursArrayLength = feasibleHoursArray.length;
  // Calculate the size of the group we should break the feasiable hours
  slotGroupLength = (feasibleHoursArrayLength / config.slots_required_number);
  // Break down the slots into groups based on number of time suggestions user wants to send to Attendee
  // It enables user to provide attendee with variety of hours at different time of the day
  for (var i = 0; i < config.slots_required_number; i++) {
    // Calculate the start and end index number based on the size of each group
    slotGroupStartingIndex = Math.round(i * slotGroupLength);
    // Check if Index is out of bound then end index should be feasibleHoursArrayLength
    slotGroupEndingIndex = Math.min(Math.round((i + 1) * slotGroupLength), feasibleHoursArrayLength);
    // Creating the group with start and ending index and sorting it based on the preferred time
    sortedSlotGroup = feasibleHoursArray.slice(slotGroupStartingIndex, slotGroupEndingIndex).sort(function(a, b) {
        return a[1] - b[1];
      })
      // Pick the time slot from each slot group
    if (sortedSlotGroup.length)
      feasibleSlots.push(sortedSlotGroup[Math.floor(Math.random() * sortedSlotGroup.length)][0]);
  }
  return feasibleSlots;
};