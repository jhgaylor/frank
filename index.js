// This file will be responsible for using all the other code we write to 'do work'
// * On load read the db and set timeouts to send the emails necessary in the next day. 
// * Do a new query every day or boot whichever comes first
// * Use flags for which sms have been sent so as to not double send
var Database = require('./db');
var Models = require('./models');
var SMS = require('./sms');
var dayInMilliseconds = 60*60*24*1000;
var intervalHandle;

start();

function start () {
  Database.getDB(function (db) {
    // attempt to sms clients who need to receive one today, or log an error
    getAndSMSClients(db);
    getPendingResponses(db);

    intervalHandle = setInterval(function () {
      getAndSMSClients(db);
      getPendingResponses(db);
    }, dayInMilliseconds);
  });
}

function restart (error) {
  console.log("Error: ", error.stack);
  clearInterval(intervalHandle);
  start();
}

function getAndSMSClients (db) {
  // creates a db connection, makes a query, tears down the connection and calls cb w/ clients.
  // no reason to keep a persistent db connection for 1 query per 24h
  Models.getAllClients(db, function (clients) {
    try {
      // clients here is an array of augmented db objects. yay functions
      smsTodaysClients(clients);
    } catch (error) {
      db.close();
      restart(error);
    }
  });
}

function smsTodaysClients (clients) {
  // TODO: better date handling. this breaks when setting a negative #
  var aWeekAgo = new Date();
  aWeekAgo.setDate(aWeekAgo.getDate() - 7);

  var aMonthAgo = new Date();
  aMonthAgo.setMonth(aMonthAgo.getMonth() - 1);

  var threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

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
  clients.forEach(function (client) {
    // Note that this relies on the order of the milestones. That is why
    // we are use an array of milestones rather than a map.
    // This will only send one milestone sms per run
    for (key in mileStones) {
      var milestone = mileStones[key];
      if (! client.wasSentSMS[milestone.name]) {
        if (client.signupDate < milestone.date) {
          client.sendSMS(milestone);
          break;
        }
      }
    }
  });
}

function getPendingResponses (db) {
  Models.getAllClients(db, function (clients) {
    var clientPhoneNumbers = clients.map(function (client) {
      return client.phoneNumber;
    });
    SMS.client.messages.list(function (err, data) {
      data.messages.forEach(function (message) {
        var messageIsFromClient = (clientPhoneNumbers.indexOf(message.from) > -1);
        if (messageIsFromClient) {
          handleIncomingClientMessage(db, message);
        }
      });
    });
  });
}

function handleIncomingClientMessage (db, message) {
  Models.getClientByNumber(db, message.from, function (client) {
    if (! client) {
      console.log("No client found for this number. Weird.");
      return;
    }
    var responseIds = client.responses.map(function (response) {
      return response.sid;
    });
    if (responseIds.indexOf(message.sid) > -1) {
      // we've already dealt with this message;
      return;
    }
    client.recordResponse(message);
  });
}
