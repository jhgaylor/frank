// Grab some twilio information from the environment. Unlike with the database
// connection string, there is no appropriate value to default to. It is also
// bad practice to commit these values to source control.
// All of these values are required in order for SMS to be sent through Twilio.
var twilio_sid = process.env.TWILIO_SID;
var twilio_auth_token = process.env.TWILIO_AUTH_TOKEN;
var twilio_number = process.env.TWILIO_NUMBER;

// make sure Twilio is defined even if it is not an actual Twilio Client.
// This will give us a way to determine if Twilio is configured later
// without having to worry about issues related to Twilio being undefined
// or confused about hoisting within conditional blocks.
var Twilio = null;

// if all of the required twilio configuration values are present, make a client.
if (twilio_sid && twilio_auth_token && twilio_number) {
  Twilio = require('twilio')(twilio_sid, twilio_auth_token);
} else {
  console.warn("Please note that twilio is not enabled and outgoing SMS will only appear in the console.");
}

// A simple wrapper around the twilio client library. sends a message to a number from 
// the configured twilio number and then fires a callback with Twilio's results.
function sendWithTwilio (number, message, cb) {
  //Send an SMS text message
  Twilio.sendMessage({
    to: number,
    from: twilio_number,
    body: message
  }, cb);
}

// our public api for sending messages. This will always log the intention to send a message
// to the console and only send the message if the twilio client was properly configured.
function send (number, message, cb) {
  console.log("SMS: ", number, message);
  if (Twilio) {
    sendWithTwilio(number, message, cb);
  } else {
    cb();
  }
}

// don't export sendWithTwilio. It is a private method used by `send`. Expose the Twilio client
// in order to consume incoming messages.
module.exports = {
  client: Twilio,
  send: send
}
