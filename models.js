var SMS = require('./sms');

function getClients (db, operator, cb) {
  var collection = db.collection('clients');
  collection.find(operator).toArray(function (err, docs) {
    var clients = docs.map(function (doc) {
      return makeClient(db, doc);
    });
    cb(clients);
  });
}

function getAllClients (db, cb) {
  getClients(db, {}, cb);
}

function getClientByNumber (db, number, cb) {
  getClients(db, {
    phoneNumber: number
  }, function (clients) {
    cb(clients && clients[0] || null);
  });
}

function makeClient (db, client) {
  var collection = db.collection('clients');
  // this method will persist the object as it exists to the database.
  // This mechanism is not appropriate in an environment where a record in the
  // database can be updated by another process, but it fits our needs so we 
  // won't convolute the example.
  client.save = function (cb) {
    if (client._id) {
      // overwrite the existing record in the db with the one in memory.
      collection.updateOne({_id: client._id}, client, cb);
    } else {
      // the record doesn't have an _id yet so mongodb hasn't written it before.
      // this would mean we are making a client, which we wouldn't ordinarily do
      // but this is a good example of overloading a function's purpose based on parameters
      collection.insertOne(client, cb);
    }
  }

  client.sendSMS = function (milestone, cb) {
    SMS.send(client.phoneNumber, client.name + ", " + milestone.message, function (error, responseData) {
      if (error) {
        throw error;
      }
      // "responseData" is a JavaScript object containing data received from Twilio.
      // A sample response from sending an SMS message is here (click "JSON" to see how the data appears in JavaScript):
      // http://www.twilio.com/docs/api/rest/sending-sms#example-1

      // this syntax is needed for the mongodb query so that we update a single field 
      // of a subdocument rather than replacing the subdocument
      var fieldString = 'wasSentSMS.' + milestone.name
      var operation = {
        $set: {}
      };
      operation.$set[fieldString] = true;
      collection.updateOne({_id: client._id}, operation);
    });
  }

  return client;
}

module.exports = {
  getAllClients: getAllClients,
  getClientByNumber: getClientByNumber,
  Client: makeClient
};
