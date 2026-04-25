const mongoose = require('mongoose');
const { languageNames } = require('../config/languages');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  language: {
    type: String,
    enum: languageNames,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'volunteer', 'admin'],
    default: 'user'
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  emergencyContactName: {
    type: String,
    trim: true,
    default: ''
  },
  emergencyContactPhone: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
