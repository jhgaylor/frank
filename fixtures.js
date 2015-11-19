// Pull in the database module to get access
// to a mongodb connection handle.
var Database = require('./db');

// Bring in Client model to persist new client POJOs
var Client = require('./models').Client;

// Define a set of clients to seed the database with.
// These clients will allow a quick smoke test to be run.
var clientsData = [{
    name: "joe",
    phoneNumber: "+15555555555",
    signupDate: new Date("03/22/2015"),
    wasSentSMS: {
      weekOne: false,
      monthOne: false,
      monthThree: false
    },
    responses: []
  }, {
    name: "sue",
    phoneNumber: "+15555555555",
    signupDate: new Date("10/09/2015"),
    wasSentSMS: {
      weekOne: false,
      monthOne: false,
      monthThree: false
    },
    responses: []
  },{
    name: "bob",
    phoneNumber: "+15555555555",
    signupDate: new Date("11/09/2015"),
    wasSentSMS: {
      weekOne: false,
      monthOne: false,
      monthThree: false
    },
    responses: []
  }, {
    name: "karen",
    phoneNumber: "+15555555555",
    signupDate: new Date("11/16/2015"),
    wasSentSMS: {
      weekOne: false,
      monthOne: false,
      monthThree: false
    },
    responses: []
  }
];

// Grab a connection handle
Database.getDB(function (db) {
  // Track the number of clients that have been inserted.
  // This is a kludge to avoid proper async management.
  // I was adverse to bringing in more libraries to the project
  // in order to illustrate how to "get it done" without significant
  // knowledge of the ecosystem.
  var completeCount = 0;
  // turn the client POJOs into Client objects, and then use
  // forEach to iterate over the clients in order to store them
  // in the database. Finally, Close the database connection pool
  // after all of the clients have been inserted.
  // Note: this crashes in a fiery mess if any of the inserts timeout of fail.
  var clients = clientsData.map(function (clientData) {
    return Client(db, clientData);
  }).forEach(function (client) {
    client.save(function () {
      completeCount += 1;
      if (completeCount === clientsData.length) {
        console.log("All fixtures have finished. Goodbye.");
        db.close();
      }
    });
  });
});
