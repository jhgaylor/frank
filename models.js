// Bring in the SMS module so that the closures attached to the `client`
// objects returned by `makeClient` will have access to `SMS.send`
var SMS = require('./sms');

// Fires a callback with all the clients matching a specified mongodb selector
// This is a useful as a building block for other, more specific, client "getters".
function getClients (db, selector, callback) {
  var collection = db.collection('clients');
  collection.find(selector).toArray(function (err, docs) {
    // Array.prototype.map returns an array of values created from the values
    // returned when each value is put through a transformation function.
    // In this case we are changing an array of mongodb documents (POJOs) into
    // Client objects, with methods for operating on the data held within.
    var clients = docs.map(function (doc) {
      return makeClient(db, doc);
    });
    callback(clients);
  });
}

// A convenience function to get every client from the database.
// It simply wraps getClients but has no option to change the selector.
// This gives it a simpler signature that can be understood at a glance.
function getAllClients (db, callback) {
  getClients(db, {}, callback);
}

// A convenient function get a client object by phone number. The number
// should be formatted as a valid twilio number. In my case that is "+1xxxXXXxxxx"
// Like getAllClients, this signature is more easily understood.
function getClientByNumber (db, number, callback) {
  getClients(db, {
    phoneNumber: number
  }, function (clients) {
    callback(clients && clients[0] || null);
  });
}

// Takes a db handle and a client document and returns a Client object.
// This isn't the most effective way to create these objects, but by
// omitting prototypes we can focus on other parts of the program.
// Our MongoDB library is kind enough to not store the methods to the database.
function makeClient (db, client) {
  // Get a handle to the clients collection of the database. In mongodb a 
  // collection is comparable to an SQL table.
  var collection = db.collection('clients');

  // this method will persist the object as it exists in memory to the database.
  // This mechanism is not appropriate in an environment where a record in the
  // database can be updated by another process, but it fits our needs so there is 
  // no need to convolute the example.
  client.save = function (callback) {
    // having an _id attribute is a clear indication that a client document
    // has already been persisted before. If this is true, we should update
    // the document that exists rather than making a new one.
    if (client._id) {
      // overwrite the existing record in the db with the one in memory.
      collection.updateOne({_id: client._id}, client, callback);
    } else {
      // the record doesn't have an _id yet so mongodb hasn't written it before.
      // this would mean we are making a client, which we wouldn't ordinarily do
      // but this is a good example of overloading a function's purpose based on parameters.
      // it also powers fixtures.
      collection.insertOne(client, callback);
    }
  }

  // a mechanism for storing incoming twilio messages to the database, associated
  // with the client from which they originated.
  // This method attempts to determine which survey the responses are associated with
  // but can only assume that an incoming message is related to the most recent outgoing message.
  client.recordResponse = function (response, callback) {
    // attempt to figure out which milestone this was for by choosing the one
    // which most recently caused an sms to be sent.
    // By chaining if/elseif/else, I ensure that once a milestone matches
    // the program will stop checking for others. This is important because
    // if we sent the monthThree milestone we definitely sent the other two
    // and it would be no good for every response to be associated with weekOne
    if (client.wasSentSMS.monthThree) {
      response.milestone = "monthThree";
    } else if (client.wasSentSMS.monthOne) {
      response.milestone = "monthOne";
    } else {
      response.milestone = "weekOne";
    }
    // here we call updateOne on the current client using the $addToSet operation.
    // $addToSet will ensure that we don't add a duplicate reponse to the responses array
    collection.updateOne({_id: client._id}, {
      $addToSet: {
        responses: response
      }
    }, callback);
  }

  // A mechanism for sending the message related to a given milestone. At the point
  // that this is called, the decision has been made is that this milestone
  // needs to be communicated to the client.
  client.sendSMS = function (milestone, callback) {
    var personalizedMilestoneMessage = client.name + ", " + milestone.message;
    SMS.send(client.phoneNumber, personalizedMilestoneMessage, function (error, responseData) {
      if (error) {
        console.log("failed to send sms", error, error.stack);
        throw error;
      }
      // "responseData" is a JavaScript object containing data received from Twilio.
      // A sample response from sending an SMS message is here (click "JSON" to see how the data appears in JavaScript):
      // http://www.twilio.com/docs/api/rest/sending-sms#example-1

      // this syntax is needed for the mongodb query so that we update a single field 
      // of a subdocument rather than replacing the subdocument. This is a combination of 
      // two features. First, is the primary incentive provided by mongodb of being able
      // to update a field of a subdocument by specifying the location as a string in the form
      // of 'subdocument.field'. Second is a javascript feature of being able to use any string 
      // as an object's attribute. The way to access strings that don't match /[A-Za-z0-9]/ is
      // to use the index notation of object["non.standard.attribute"]
      // Note: object.non.standard.attribute is not the same as object["non.standard.attribute"]
      var fieldString = 'wasSentSMS.' + milestone.name
      // the $set operation replaces a value at a specified location in the document
      var operation = {
        $set: {}
      };
      operation.$set[fieldString] = new Date;
      collection.updateOne({_id: client._id}, operation);
    });
  }

  return client;
}

// here we export only the getClients wrappers. there is no need in the program
// to have access to the more general purpose form.
// it was written as a building block
module.exports = {
  getAllClients: getAllClients,
  getClientByNumber: getClientByNumber,
  Client: makeClient
};
