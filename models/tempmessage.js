const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const tempmessageSchema = new Schema({
  username: String,
  content: String,
  creation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TempMessage', tempmessageSchema);