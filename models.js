var SMS = require('./sms');

function getAllClients (db, cb) {
  var collection = db.collection('clients');
  collection.find({}).toArray(function (err, docs) {
    var clients = docs.map(function (doc) {
      return makeClient(db, doc);
    });
    cb(clients);
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
    var message = client.name + ", you are at milestone: " + milestone;
    SMS.send(client.phoneNumber, message, function (error) {
      if (error) {
        throw error;
      }
      // this syntax is needed for the mongodb query so that we update a single field 
      // of a subdocument rather than replacing the subdocument
      var fieldString = 'wasSentSMS.' + milestone
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
  Client: makeClient
};
