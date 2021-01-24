if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const http = require('http').createServer(app);

const port = process.env.PORT;
const io = require('socket.io')(http);

mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.on('connected', () => console.log('Succesfully connected to MongoDB!'));

const TempMessage = require('./models/tempmessage.js');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));

__dirname = path.join(__dirname, 'views');

app.get('/register', (req, res) => {
  res.sendFile('register.html', { root: __dirname });
});

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname });
});

var guestNr = 1;
var defaultName;
var users = [];
var dbMessages = [];

io.on('connection', (client) => {
  var addr = client.handshake.address;
  console.log('New connection from ' + addr);
  defaultName = `Guest${guestNr}`;
  client.username = defaultName;
  guestNr = guestNr + 1;
  TempMessage.find({}, { username: 1, content: 1, _id: 0 }, (err, res) => {
    if (err) { console.error(err) }
    else {
      dbMessages = [...res];
      io.sockets.to(client.id).emit('load messages', dbMessages);
    }
  });
  client.broadcast.emit('chat message', `${defaultName} connected`, true);
  users = [...users, defaultName];

  client.on('new user', (username) => {
    var existName = users.findIndex(el => el == username);
    if (username != client.username) {
      if (existName != -1) {
        io.emit('chat message', `Hey ${username}, ${client.username} wanted to steal your identity. Poor him :D`);
      }
      else {
        io.emit('chat message', `${client.username} changed name to ${username}`, true);
        users[users.findIndex(el => el == client.username)] = username;
        client.username = username;
        console.log(`${client.username} changed name to ${username}`);
      }
    }
  });

  client.on('chat message', (msg, fromserver) => {
    if (msg) {
      if (fromserver) {
        io.emit('chat message', msg);
      }
      else {
        io.emit('chat message', `${client.username} : ${msg}`);
        TempMessage.create({ username: client.username, content: msg }, (err) => {
          if (err) return handleError(err);
        });
      }
      console.log(`{ username: '${client.username}', message: ${msg} } `);
    }
  });

  client.on('disconnect', function () {
    io.emit('chat message', `${client.username} disconnected.`);
    users.splice(users.findIndex(el => el == client.username), 1);
  })
});


http.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});