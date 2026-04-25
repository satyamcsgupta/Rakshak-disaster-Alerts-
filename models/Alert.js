const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  disasterType: {
    type: String,
    required: true,
    trim: true
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
  severity: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    required: true
  },
  latitude: {
    type: Number,
    min: -90,
    max: 90,
    default: null
  },
  longitude: {
    type: Number,
    min: -180,
    max: 180,
    default: null
  },
  messageEnglish: {
    type: String,
    required: true,
    trim: true
  },
  messageHindi: {
    type: String,
    required: true,
    trim: true
  },
  messageMarathi: {
    type: String,
    required: true,
    trim: true
  },
  messageGujarati: {
    type: String,
    trim: true,
    default: ''
  },
  messageBengali: {
    type: String,
    trim: true,
    default: ''
  },
  messageTamil: {
    type: String,
    trim: true,
    default: ''
  },
  messageTelugu: {
    type: String,
    trim: true,
    default: ''
  },
  messageKannada: {
    type: String,
    trim: true,
    default: ''
  },
  messageMalayalam: {
    type: String,
    trim: true,
    default: ''
  },
  messagePunjabi: {
    type: String,
    trim: true,
    default: ''
  },
  messageOdia: {
    type: String,
    trim: true,
    default: ''
  },
  precautions: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Alert', alertSchema);
