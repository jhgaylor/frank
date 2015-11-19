To Install:

```sh
git clone https://github.com/jhgaylor/frank.git
npm install
```

To Run with Twilio

```sh
TWILIO_SID=<YOUR_SID> TWILIO_AUTH_TOKEN=<YOUR_AUTH_TOKEN> TWILIO_NUMBER=<YOUR_TWILIO_NUMBER node index.js
```

To Run without Twilio

```sh
node index.js
```

To Run with a different database

```sh
MONGO_URL=mongodb://remoteDBServer:27017/foo_db node index.js
```