const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const messageSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  content: String,
  creation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);