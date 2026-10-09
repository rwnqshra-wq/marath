const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  isConnected: { type: Boolean, default: false },
  currentPage: { type: String, default: 'index' },
  lastActive: { type: Date, default: Date.now },
  formData: { type: Object, default: {} }
});

const UserSession = mongoose.model('UserSession', userSessionSchema);

module.exports = { UserSession };
