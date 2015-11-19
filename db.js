// require the MongoDB node.js library
var MongoClient = require('mongodb').MongoClient;

// The default mongodb url to use. This assumes a local mongodb instance
// running on its default port, 27017, and using a database called "franks_gym"
var defaultMongoDBUrl = 'mongodb://localhost:27017/franks_gym';
// Set a default mongodb connection string to be used if one
// is not available from the environment. This enables calling
// the script as `MONGO_URL=mongodb://server:port/db_name node index.js`
// to connect to a non default database.
var DataBaseURL = process.env.MONGO_URL || defaultMongoDBUrl;

// Fires a callback with a mongodb connection pool handle if a connection
// is successfully established with the database server. This handle will
// be used all around the application and we are leaving the management of
// that to the consumer of the function.
function getDBConnection (callback) {
  // Note that the mongodb library is managing a pool of database connections
  // for us underneath the hood. This mechanism is much faster than setting up
  // and tearing down connections as they are needed and used.
  MongoClient.connect(DataBaseURL, function (err, db) {
    // we aren't even going to try and handle the possible database connection
    // issues for now as there isn't anything the program knows how to do
    // based on the error. If we don't have a database handle, we can't proceed.
    if (err) {
      throw err;
    }
    console.log("Connected correctly to server");
    callback(db);
  });
}

// make the function available when `require`d as getDB
// ie: require('thisFile').getDB(function (db) {});
module.exports = {
  getDB: getDBConnection
};
