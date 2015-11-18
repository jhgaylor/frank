var twilio_sid = process.env.TWILIO_SID;
var twilio_auth_token = process.env.TWILIO_AUTH_TOKEN;
var twilio_number = process.env.TWILIO_NUMBER;

var Twilio = null;
if (twilio_sid && twilio_auth_token && twilio_number) {
  Twilio = require('twilio')(twilio_sid, twilio_auth_token);
} else {
  console.warn("Please note that twilio is not enabled and outgoing SMS will only appear in the console.");
}

function sendWithTwilio (number, message, cb) {
  //Send an SMS text message
  Twilio.sendMessage({
    to: number,
    from: twilio_number,
    body: message
  }, cb);
}

function send (number, message, cb) {
  console.log("SMS: ", number, message);
  if (Twilio) {
    sendWithTwilio(number, message, cb);
  } else {
    cb();
  }
}

module.exports = {
  send: send
}
