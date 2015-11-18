var Database = require('./db');
var Client = require('./models').Client;

var joe = {
  name: "joe",
  phoneNumber: "+15555555555",
  signupDate: new Date("03/22/2015"),
  wasSentSMS: {
    weekOne: false,
    monthOne: false,
    monthThree: false
  }
};

var sue = {
  name: "sue",
  phoneNumber: "+15555555555",
  signupDate: new Date("10/09/2015"),
  wasSentSMS: {
    weekOne: false,
    monthOne: false,
    monthThree: false
  }
};

var bob = {
  name: "bob",
  phoneNumber: "+15555555555",
  signupDate: new Date("11/09/2015"),
  wasSentSMS: {
    weekOne: false,
    monthOne: false,
    monthThree: false
  }
};

var karen = {
  name: "karen",
  phoneNumber: "+15555555555",
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
