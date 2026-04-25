const mongoose = require('mongoose');

const sosSchema = new mongoose.Schema({
  userName: {
    type: String,
    trim: true,
    default: 'Anonymous'
  },
  state: {
    type: String,
    required: true,
    trim: true
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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SOS', sosSchema);
