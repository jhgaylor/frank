var Database = require('./db');
var Client = require('./models').Client;

var joe = {
  phoneNumber: "joe",
  signupDate: new Date("03/22/2015"),
  wasSentSMS: {
    weekOne: false,
    monthOne: false,
    monthThree: false
  }
};

var sue = {
  phoneNumber: "sue",
  signupDate: new Date("10/22/2015"),
  wasSentSMS: {
    weekOne: false,
    monthOne: false,
    monthThree: false
  }
};

var bob = {
  phoneNumber: "bob",
  signupDate: new Date("11/09/2015"),
  wasSentSMS: {
    weekOne: false,
    monthOne: false,
    monthThree: false
  }
};

var karen = {
  phoneNumber: "karen",
  signupDate: new Date("11/16/2015"),
  wasSentSMS: {
    weekOne: false,
    monthOne: false,
    monthThree: false
  }
};

var clientsData = [
  joe,
  sue,
  bob,
  karen
];

Database.getDB(function (db) {
  var completeCount = 0;
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
