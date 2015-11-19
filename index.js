// This file will be responsible for using all the other code we write to 'do work'.
// * On load read the db and set an interval to send the sms necessary for that day.
// * Use flags for which sms have been sent so as to not double send.
var Database = require('./db');
var Models = require('./models');
var SMS = require('./sms');
var dayInMilliseconds = 60*60*24*1000;
var intervalHandle;

// begins the program. This can be run here because Javascript will hoist the function definitions.
start();

function start () {
  // much of the application needs access to a db connection pool. This is where we manage
  // the lifecycle of that connection pool. We also won't begin calling functions until a database
  // handle is available.
  Database.getDB(function (db) {
    function doWork () {
      // attempt to sms clients who need to receive one today, or log an error
      getAndSMSClients(db);
      // read incoming messages from twilio and store them with the corresponding client data.
      getPendingResponses(db);
    }
    // call doWork immediately
    doWork();
    // and then call it once per day after that.
    intervalHandle = setInterval(doWork, dayInMilliseconds);
  });
}

// If an error comes up, log it out and try again.
function restart (error) {
  // Error is an Object. We want to know what series of events led to the terminal error.
  console.log("Error: ", error.stack);
  // clearing the interval will prevent that interval from running again on 
  // the next tick. without this, we would overwrite the intervalHandle which
  // would lead to a memory leak and some hard to track down bugs as the asynchronous
  // nature of javascript has multiple attempts to send SMSs racing with each other.
  clearInterval(intervalHandle);
  // after cleaning up the last run, start it up again.
  start();
}

function getAndSMSClients (db) {
  Models.getAllClients(db, function (clients) {
    // attempt to send the SMS for today. If that fails then start over again.
    // this actually will not restart if the error arises from getting the models.
    try {
      // clients here is an array of augmented db objects. getAllClients transformed it already
      smsTodaysClients(clients);
    } catch (error) {
      // if we are going to restart, we should first make sure to tear down the database connection.
      // this is not in the restart function because it would have drastically changed the way restart
      // was declared and defined only to distract from the bigger picture.
      db.close();
      restart(error);
    }
  });
}

function smsTodaysClients (clients) {
  // TODO: better date handling. this breaks when setting a negative #
  // Define a few dates. These are used to determine if a client has passed a new milestone
  var aWeekAgo = new Date();
  aWeekAgo.setDate(aWeekAgo.getDate() - 7);

  var aMonthAgo = new Date();
  aMonthAgo.setMonth(aMonthAgo.getMonth() - 1);

  var threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // Define all the milestones in terms of the earliest date on which they are achievable.
  var mileStones = [{
    date: aWeekAgo,
    name: 'weekOne',
    message: "You've been coming for a week now. Did you find your training sessions productive? Are you looking forward to next week?"
  }, {
    date: aMonthAgo,
    name: 'monthOne',
    message: "Thank you for being a member for a month. Are you comfortable in the gym? Would you recommend us to a friend?"
  }, {
    date: threeMonthsAgo,
    name: 'monthThree',
    message: "You are three months in and going strong. How likely are you to recommend us to a friend? 1 (Never) to 10 (Always Do)"
  }];

  // for each client, determine if a milestone was passed. If it was, send and sms and move
  // on the the next client.
  clients.forEach(function (client) {
    // Note that this relies on the order of the milestones. That is why
    // we are use an array of milestones rather than a map.
    // This will only send one milestone sms per run.

    // Here we use a for..in loop so that we can break out of it. There are other ways
    // of accomplishing this including a flag and using es6 Array.prototype methods but
    // the break statement is probably the cleanest way short of bringing in a new runtime
    // or library for something we can already accomplish.
    for (key in mileStones) {
      // a for..in loop gives you one key a time. if you need the value, you have
      // to get it yourself. 
      var milestone = mileStones[key];
      // if the client has not been sent an SMS for this milestone
      if (! client.wasSentSMS[milestone.name]) {
        // and if a client has been signed up for long enough to get the milestone sms
        if (client.signupDate < milestone.date) {
          // then send the sms
          client.sendSMS(milestone);
          // breaking here ensures that a client only gets one sms a day.
          break;
        }
      }
    }
  });
}


// In order to record incoming client responses, use the Twilio SMS client to grab all
// the messages received by your twilio number. Then store each message with the appropriate
// client's data.
function getPendingResponses (db) {
  // If the SMS client isn't available because the environment wasn't configured correctly,
  // go ahead and bail because there is nothing we can do.
  if (! SMS.client) {
    return;
  }

  // First we need all the phone numbers of Frank's clients. This is so we can ignore
  // messages that did not come from one of them.
  Models.getAllClients(db, function (clients) {
    // an array of clients is great but we need an array of their phoneNumbers in order
    // to facilitate lookups.
    var clientPhoneNumbers = clients.map(function (client) {
      return client.phoneNumber;
    });

    // Grab all the SMS received by the environment's twilio number.
    SMS.client.messages.list(function (err, data) {
      // for each twilio message 
      data.messages.forEach(function (message) {
        // determine if the message is from a client by checking if the from number
        // is one of the the clients' number.
        var messageIsFromClient = (clientPhoneNumbers.indexOf(message.from) > -1);
        // if it is a message from a client
        if (messageIsFromClient) {
          // do whatever we plan to do with a message from a client
          handleIncomingClientMessage(db, message);
        }
      });
    });
  });
}

// When a client sends us a message, we want to store it as a response
// but only if we haven't seen it before.
function handleIncomingClientMessage (db, message) {
  // Looks up the client this message came in from. We *could* have passed
  // this information in from a previous method but that would have complicated
  // either the lookup, the lookup datastructure creation process, or the Client
  // object creation that happens behind the scenes here.
  Models.getClientByNumber(db, message.from, function (client) {
    // if the message wasn't from a client, we can't do anything with it so we bail.
    if (! client) {
      console.log("No client found for this number. Weird.");
      return;
    }
    // get the twilio SID of each message we have already associated with this client.
    var responseIds = client.responses.map(function (response) {
      return response.sid;
    });

    // if we haven't seen this message before (indicated by its sid is unknown), store it
    if (responseIds.indexOf(message.sid) === -1) {
      client.recordResponse(message);
    }
  });
}
