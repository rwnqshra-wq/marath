const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  isConnected: { type: Boolean, default: false },
  currentPage: { type: String, default: 'index' },
  lastActive: { type: Date, default: Date.now },
  formData: { type: Object, default: {} }
}, { strict: false });

const UserSession = mongoose.model('UserSession', userSessionSchema);

module.exports = { UserSession };

