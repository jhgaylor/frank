// This file will be responsible for using all the other code we write to 'do work'
// * On load read the db and set timeouts to send the emails necessary in the next day. 
// * Do a new query every day or boot whichever comes first
// * Use flags for which sms have been sent so as to not double send
var Database = require('./db');
var Models = require('./models');

var dayInMilliseconds = 60*60*24*1000;
var intervalHandle;

start();

function start () {
  Database.getDB(function (db) {
    // attempt to sms clients who need to receive one today, or log an error
    getAndSMSClients(db);
    intervalHandle = setInterval(function () {
      getAndSMSClients(db);
    }, dayInMilliseconds);
  });
}

function restart (error) {
  console.log(error.stack);
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
    name: 'weekOne'
  }, {
    date: aMonthAgo,
    name: 'monthOne'
  }, {
    date: threeMonthsAgo,
    name: 'monthThree'
  }];

  clients.forEach(function (client) {
    // Note that this relies on the order of the milestones. That is why
    // we are use an array of milestones rather than a map.
    // This will only send one milestone sms per run
    for (key in mileStones) {
      var milestone = mileStones[key];
      if (! client.wasSentSMS[milestone.name]) {
        if (client.signupDate < milestone.date) {
          client.sendSMS(milestone.name);
          break;
        }
      }
    }
  });
}
