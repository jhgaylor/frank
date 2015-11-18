// will expose the "models", which, via closure + require's cache, will be the sole access point to the database
var MongoClient = require('mongodb').MongoClient;

var defaultMongoDBUrl = 'mongodb://localhost:27017/franks_gym';
// Connection URL - which db server to connect to
var DataBaseURL = process.env.MONGO_URL || defaultMongoDBUrl;

function getDBConnection (callback) {
  // Use connect method to connect to the Server
  MongoClient.connect(DataBaseURL, function (err, db) {
    if (err) {
      throw err;
    }
    console.log("Connected correctly to server");
    callback(db);
  });
}

module.exports = {
  getDB: getDBConnection
};
