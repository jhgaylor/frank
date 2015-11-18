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

module.exports = {
  getAllClients: getAllClients
};
