if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const assert = require('assert');
const randomstring = require("randomstring");


const app = express();

const http = require('http').createServer(app);

const port = process.env.PORT;
const io = require('socket.io')(http);

mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .catch(error => console.log('DB_ERROR: ' + error));

const db = mongoose.connection;


db.on('connected', () => {
  console.log('DB: Connection Established')
})

db.on('reconnected', () => {
  console.log('DB: Connection Reestablished')
})

db.on('disconnected', () => {
  console.log('DB: Connection Disconnected')
})

db.on('close', () => {
  console.log('DB: Connection Closed')
})

db.on('error', (error) => {
  console.log('DB_ERROR: ' + error)
})

const TempMessage = require('./models/tempmessage.js');
const User = require('./models/user.js');
const nspIdSize = 5;
var guestNr = 1;
var defaultName;
var nspUsers = {};
var dbMessages = [];

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));

__dirname = path.join(__dirname, 'views');

app.get('/register', (req, res) => {
  res.sendFile('register.html', { root: __dirname });
});

app.post('/register', (req, res) => {
  let nspId = randomstring.generate(nspIdSize);
  res.redirect(`/${nspId}`);
});

app.get('/:nspId', (req, res) => {
  console.log(req.params.nspId);
  res.sendFile('index.html', { root: __dirname });
});

const chatNsp = io.of(new RegExp("^\/([0-9a-zA-Z]){" + nspIdSize + "}"));

chatNsp.on("connection", client => {
  console.log("Socket Connected");

  client.on("get username", (username) => {
    client.username = username;

    const workspace = client.nsp;
    const workspaceName = workspace.name;

    if (client.username == null) {
      defaultName = `Guest${guestNr}`;
      client.username = defaultName;
      workspace.to(client.id).emit("set username", client.username);
      guestNr = guestNr + 1;
    }

    if (nspUsers[workspaceName]) {
      if (nspUsers[workspaceName].find(el => el === client.username) === undefined) {
        nspUsers[workspaceName] = [...nspUsers[workspaceName], client.username];
      }
    }
    else {
      nspUsers[workspaceName] = [client.username];
    }

    console.log(client.username);
    workspace.emit('chat message', `Hello, ${client.username}`);

    client.on('change nickname', (username) => {
      var existName = nspUsers[workspaceName].findIndex(el => el == username);
      if (username != client.username) {
        if (existName != -1) {
          workspace.emit('chat message', `Hey ${username}, ${client.username} wanted to steal your identity. Poor him :D`);
        }
        else {
          workspace.emit('set username', username);
          workspace.emit('chat message', `${client.username} changed name to ${username}`, true);
          console.log(`${client.username} changed name to ${username}`);
          nspUsers[workspaceName][nspUsers[workspaceName].findIndex(el => el == client.username)] = username;
          client.username = username;
        }
      }
    });

    client.on('chat message', (msg, fromserver) => {
      if (msg) {
        if (fromserver) {
          workspace.emit('chat message', msg);
        }
        else {
          workspace.emit('chat message', `${client.username} : ${msg}`);
        }
        console.log(`{ username: '${client.username}', message: ${msg} } `);
      }
    });

    client.on("disconnect", client => {
      nspUsers[workspaceName].splice(nspUsers[workspaceName].findIndex(el => el == client.username), 1);
      workspace.emit('chat message', `${client.username} disconnected`);
    });
  });
});



/*
io.on('connection', async (client) => {
  var addr = client.handshake.address;
 
  User.find({ address: addr }, (err, res) => {
    if (err) { console.log(err) }
    else {
      if (res.length === 0) {
        console.log("User nou: " + addr);
        guestNr = guestNr + 1;
        defaultName = `Guest${guestNr}`;
        addUser(defaultName, addr);
        client.username = defaultName;
        users = [...users, defaultName];
      }
      else {
        console.log("User vechi:" + res[0].username);
        client.username = res[0].username;
        users = [...users, client.username];
      }
 
      client.broadcast.emit('chat message', `${client.username} connected`, true);
 
      assert(client.username !== undefined);
 
      TempMessage.find({}, { username: 1, content: 1, _id: 0 }, (err, res) => {
        if (err) { console.error(err) }
        else {
          dbMessages = [...res];
          io.sockets.to(client.id).emit('load chat', dbMessages, client.username);
        }
      })
    }
  });
 
 
 
  client.on('change nickname', (username) => {
    var existName = users.findIndex(el => el == username);
    if (username != client.username) {
      if (existName != -1) {
        io.emit('chat message', `Hey ${username}, ${client.username} wanted to steal your identity. Poor him :D`);
      }
      else {
        updateUsername(client.username, username);
        io.emit('chat message', `${client.username} changed name to ${username}`, true);
        console.log(`${client.username} changed name to ${username}`);
        users[users.findIndex(el => el == client.username)] = username;
        client.username = username;
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
          if (err) return console.log("CREATE_MESSAGE_ERROR:" + err);
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
*/


http.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});