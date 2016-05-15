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
// Set the user's workable hours
const CAL_AVAILIBILITY_TIME_START = moment.tz("08:00", 'HH:mm', USER_TIMEZONE);
const CAL_AVAILIBILITY_TIME_END = moment.tz("22:00", 'HH:mm', USER_TIMEZONE);

// The API that returns the in-email representation.
module.exports = function(req, res) {
  var feasibleTimeSlots;
  // Get the latitue and longitude for the city user selected
  locations.autocomplete({ input: req.param('text'), types: "(cities)" }, function(err, response) {
    locations.details({ placeid: response.predictions[0].place_id }, function(err, response) {
      // Get the timezone of the 
      request('https://api.timezonedb.com/?lat=' + response.result.geometry.location.lat + '&lng=' + response.result.geometry.location.lng + '&key=I16KGCYBRXQ8&format=json', function(error, response, body) {
        if (!error && response.statusCode == 200) {
          var userStartDate = CAL_AVAILIBILITY_TIME_START.add(1, "days")
          var userEndDate = CAL_AVAILIBILITY_TIME_END.add(1, "days")

          var getRequestObject = {
            type: appbase.config.type,
            id: 'X1'
          };
          appbase.ref.get(getRequestObject).on('data', function(results) {
            var tokens = results._source;
            google.oauth2Client.setCredentials({
              'access_token': tokens.access_token,
              'refresh_token': tokens.refresh_token
            });
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
              // Get the feasiable time slots in the attendee's timezone
              feasibleTimeSlots = getFeasibleTimeSlots(JSON.parse(body).zoneName, response.items);
              // Using Mixmax SDK for displaying the slots in the Mixmax
              var html = "Let me know which time works for you tomorrow: " + feasibleTimeSlots.map(function(response) {
                return " " + response;
              })
              res.json({
                body: html,
                raw: true
              })
            });
          }).on('error', function(error) {
            console.log(error);
          });
        }
      });
    });
  });
}

// Given the timezone, get the most feasiable time slots
function getFeasibleTimeSlots(attendeeTimeZone, busySlots) {
  var feasibleHours = {}; // New object
  var userAvailabilityInHours = moment.duration(CAL_AVAILIBILITY_TIME_END.diff(CAL_AVAILIBILITY_TIME_START)).asHours();
  var attendeeAvailibilityStartTime = moment.tz("08:00", 'HH:mm', attendeeTimeZone).add(1, 'days');
  var attendeeAvailibilityEndTime = moment.tz("22:00", 'HH:mm', attendeeTimeZone).add(1, 'days');
  var userTimeInAttendeeTimeZone = CAL_AVAILIBILITY_TIME_START.clone().tz(attendeeTimeZone);
  if (busySlots.length == 0) {
    console.log('No upcoming events found.');
  } else {
    console.log('Upcoming events: ', busySlots.length);
    for (var i = 0; i < busySlots.length; i++) {
      var event = busySlots[i];
      var event_id = event.id;
      var summary = event.summary;
      var start = event.start.dateTime || event.start.date;
      var end = event.end.dateTime || event.end.date;
      var range = moment.range(start, end);
      console.log(start, end, summary)
      // Loop through all the time slots where user is available and if it belongs to Attendee workable hours
      for (j = 0; j < userAvailabilityInHours * 2; j++) {
        if (userTimeInAttendeeTimeZone.format('HHmm') >= attendeeAvailibilityStartTime.format('HHmm') && userTimeInAttendeeTimeZone.format('HHmm') <= attendeeAvailibilityEndTime.format('HHmm')) {
          if (range.contains(userTimeInAttendeeTimeZone))
            console.log("Removed: ", userTimeInAttendeeTimeZone.format('HH:mm'))
          else
            feasibleHours[userTimeInAttendeeTimeZone.format('HH:mm z')] = 1;
        }
        // Increasing the time by 30 minutes in each iteration
        userTimeInAttendeeTimeZone = userTimeInAttendeeTimeZone.add(30, "minutes");
      }
      // addAppointment(event_id, summary, start, end);

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
  for (i = 0; i < NUMBER_OF_TIME_SLOTS_REQUIRED; i++) {
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
  return feasibleSlots;
};