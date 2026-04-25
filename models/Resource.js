const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Shelter', 'Hospital', 'Water', 'Food', 'Medical Support'],
    required: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  capacity: {
    type: String,
    default: 'N/A'
  },
  contactPhone: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Resource', resourceSchema);
