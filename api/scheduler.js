var request = require('request');
var moment = require('moment-timezone');
var GoogleLocations = require('google-locations');
var locations = new GoogleLocations('AIzaSyBBxyDwTMxzB40JWvxiHDGH7rlIOoE5eU4');
var google = require('../common/google');
var appbase = require('../common/appbase');
require('moment-range');


// Configure the preference of the User
const USER_TIMEZONE = "Asia/Kolkata";
const NUMBER_OF_TIME_SLOTS_REQUIRED = 3;
const NUMBER_OF_DATES_REQUIRED = 4;
// Set the user's workable hours
const CAL_AVAILIBILITY_TIME_START = moment.tz("08:00", 'HH:mm', USER_TIMEZONE);
const CAL_AVAILIBILITY_TIME_END = moment.tz("22:00", 'HH:mm', USER_TIMEZONE);

// The API that returns the in-email representation.
module.exports = function(req, res) {
  var feasibleTimeSlots;
  // Get the latitue and longitude for the city user selected
  locations.autocomplete({ input: req.param('text'), types: "(cities)" }, function(err, response) {
    locations.details({ placeid: response.predictions[0].place_id }, function(err, response) {
      // Get the timezone of the attendee
      request('https://api.timezonedb.com/?lat=' + response.result.geometry.location.lat + '&lng=' + response.result.geometry.location.lng + '&key=I16KGCYBRXQ8&format=json', function(error, response, body) {
        if (!error && response.statusCode == 200) {
          var userStartDate = CAL_AVAILIBILITY_TIME_START.clone().add(1, "days")
          var userEndDate = CAL_AVAILIBILITY_TIME_END.clone().add(NUMBER_OF_DATES_REQUIRED, "days")
          var attendeeTimeZone = JSON.parse(body).zoneName
          var tokens = req.decoded
          console.log(tokens)
          google.oauth2Client.setCredentials({
            'access_token': tokens.access_token,
            'refresh_token': tokens.refresh_token
          });

          // Get the events from the google calendar
          google.calendar.events.list({
            auth: google.oauth2Client,
            calendarId: 'primary',
            timeMin: userStartDate.format(),
            timeMax: userEndDate.format(),
            maxResults: 250,
            singleEvents: true,
            orderBy: 'startTime'
          }, function(err, response) {
            if (err) {
              console.log('The API returned an error: ' + err);
            }
            // Using Mixmax SDK for displaying the slots in the Mixmax
            var html = "Let me know which time works for you in " + moment.tz(attendeeTimeZone).format('z') + ": </br>";
            // Get feasiable time slots for preferred number of dates
            for (k = 0; k < NUMBER_OF_DATES_REQUIRED; k++) {
              // Get the feasiable time slots in the attendee's timezone
              feasibleTimeSlots = getFeasibleTimeSlots(attendeeTimeZone, response.items, userStartDate);
              html = html + userStartDate.format('ddd, MMM Do') + ': ' + feasibleTimeSlots.map(function(response) {
                return " " + response;
              }) + "</br>"
              userStartDate = userStartDate.add(1, "days")
            }
            res.json({
              body: html,
              raw: true
            })
          });
        }
      });
    });
  });
}

// Given the timezone, get the most feasiable time slots
function getFeasibleTimeSlots(attendeeTimeZone, busySlots, userStartDate) {
  var feasibleHours = {}; // New object
  var userAvailabilityInHours = moment.duration(CAL_AVAILIBILITY_TIME_END.diff(CAL_AVAILIBILITY_TIME_START)).asHours();
  var attendeeAvailibilityStartTime = moment.tz("08:00", 'HH:mm', attendeeTimeZone);
  var attendeeAvailibilityEndTime = moment.tz("22:00", 'HH:mm', attendeeTimeZone);

  if (busySlots.length == 0) {
    console.log('No upcoming events found.');
  } else {
    console.log('Upcoming events: ', busySlots.length);
    var userTimeInAttendeeTimeZone = userStartDate.clone().tz(attendeeTimeZone);
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
          // console.log(start, end, userTimeInAttendeeTimeZone.format(), range.contains(userTimeInAttendeeTimeZone))
          if (range.contains(userTimeInAttendeeTimeZone)) {
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
  }
  return calculatFeasibleTimeSlots(feasibleHours);
}

// Given the feasiable hours, suggest the one that will work the best for attendee
function calculatFeasibleTimeSlots(feasibleHours) {
  // var minList = [00, 15, 30, 45]
  var feasibleSlots = [];
  var feasibleHoursArray = [];
  // Converting the feasiableHours object into an array
  for (hour in feasibleHours) {
    feasibleHoursArray.push([hour, feasibleHours[hour]]);
  }
  feasibleHoursArrayLength = feasibleHoursArray.length;
  // Calculate the size of the group we should break the feasiable hours
  slotGroupLength = (feasibleHoursArrayLength / NUMBER_OF_TIME_SLOTS_REQUIRED);
  // Break down the slots into groups based on number of time suggestions user wants to send to Attendee
  // It enables user to provide attendee with variety of hours at different time of the day
  for (var i = 0; i < NUMBER_OF_TIME_SLOTS_REQUIRED; i++) {
    // Calculate the start and end index number based on the size of each group
    slotGroupStartingIndex = Math.round(i * slotGroupLength);
    // Check if Index is out of bound then end index should be feasibleHoursArrayLength
    slotGroupEndingIndex = Math.min(Math.round((i + 1) * slotGroupLength), feasibleHoursArrayLength);
    // Creating the group with start and ending index and sorting it based on the preferred time
    sortedSlotGroup = feasibleHoursArray.slice(slotGroupStartingIndex, slotGroupEndingIndex).sort(function(a, b) {
        return a[1] - b[1];
      })
      // Pick the time slot from each slot group
    feasibleSlots.push(sortedSlotGroup[Math.floor(Math.random() * sortedSlotGroup.length)][0]);
  }
  feasibleSlots.sort(function(a, b) {
    return new Date('1970/01/01 ' + a) - new Date('1970/01/01 ' + b);
  });
  return feasibleSlots;
};
