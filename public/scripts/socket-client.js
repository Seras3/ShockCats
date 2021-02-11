var socket = io(document.URL);

var messages = document.getElementById('messages');
var form = document.getElementById('form');
var form2 = document.getElementById('form2');
var input = document.getElementById('input');
var input2 = document.getElementById('input2');

window.onload = () => {
  let username = localStorage.getItem("username");
  socket.emit("get username", username);
  input2.value = username;
}


function loadDone() {
  document.body.style.display = "block";
}

loadDone();

form.addEventListener('submit', function (e) {
  e.preventDefault();
  if (input.value) {
    socket.emit('chat message', input.value);
    input.value = '';
  }
});

form2.addEventListener('submit', function (e) {
  e.preventDefault();
  if (input2.value) {
    socket.emit("change nickname", input2.value);
  }
});

socket.on('load chat', function (dbmessages, username) {
  var item;
  input2.value = username;
  for (message of dbmessages) {
    item = document.createElement('li');
    item.textContent = `${message.username} : ${message.content}`;
    messages.appendChild(item);
  }
  window.scrollTo(0, document.body.scrollHeight);
  loadDone();
});

socket.on('set username', function (username) {
  localStorage.setItem("username", username);
  input2.value = username;
  console.log("User set:" + username);
});

socket.on('chat message', function (msg) {
  var item = document.createElement('li');
  item.textContent = msg;
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
});