const mongoose = require('mongoose');

const safeCheckSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: String,
  alert: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert',
    required: true
  },
  status: {
    type: String,
    enum: ['Safe', 'Need Help'],
    default: 'Safe'
  },
  location: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SafeCheck', safeCheckSchema);
