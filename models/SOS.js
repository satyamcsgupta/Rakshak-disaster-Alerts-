const mongoose = require('mongoose');

const sosSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userName: {
    type: String,
    trim: true,
    default: 'Anonymous'
  },
  contactNumber: {
    type: String,
    trim: true,
    default: ''
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    trim: true,
    default: ''
  },
  distressMessage: {
    type: String,
    required: true,
    default: 'I am in trouble'
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  locationAccuracy: {
    type: Number,
    default: null
  },
  locationSource: {
    type: String,
    enum: ['gps', 'ip', 'manual', 'unavailable'],
    default: 'unavailable'
  },
  locationCapturedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved'],
    default: 'Pending'
  },
  urgency: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  assignedVolunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  responderName: {
    type: String,
    default: ''
  },
  verificationStatus: {
    type: String,
    enum: ['Unverified', 'Verified', 'Needs Review', 'False Alarm'],
    default: 'Unverified'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  adminNote: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SOS', sosSchema);
