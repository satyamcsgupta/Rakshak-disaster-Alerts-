const mongoose = require('mongoose');

const checkInStatusSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['safe', 'need_help'],
    required: true
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  city: {
    type: String,
    trim: true,
    default: ''
  },
  state: {
    type: String,
    trim: true,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CheckInStatus', checkInStatusSchema);
