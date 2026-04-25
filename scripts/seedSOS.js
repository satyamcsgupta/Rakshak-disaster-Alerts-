require('dotenv').config();
const mongoose = require('mongoose');
const SOS = require('../models/SOS');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/idealab2';

const seedTestSOS = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing SOS for a fresh start
    await SOS.deleteMany({});
    console.log('Cleared existing SOS requests');

    const testRequests = [
      {
        userName: 'Rahul Sharma',
        state: 'Maharashtra',
        distressMessage: 'Flood water entering my house. Need immediate evacuation!',
        latitude: 19.0760,
        longitude: 72.8777,
        urgency: 'Critical',
        status: 'Pending'
      },
      {
        userName: 'Priya Verma',
        state: 'Maharashtra',
        distressMessage: 'Stuck in heavy rain, car broken down. Need tow support.',
        latitude: 19.1200,
        longitude: 72.9100,
        urgency: 'High',
        status: 'In Progress'
      },
      {
        userName: 'Amit Patel',
        state: 'Maharashtra',
        distressMessage: 'Injury during minor earthquake. Need medical kit.',
        latitude: 18.9500,
        longitude: 72.8200,
        urgency: 'Medium',
        status: 'Pending'
      },
      {
        userName: 'Same Location Test',
        state: 'Maharashtra',
        distressMessage: 'I am right next to the volunteer.',
        latitude: 19.0176, // Default mock for Mumbai center usually used in dev
        longitude: 72.8561,
        urgency: 'Low',
        status: 'Pending'
      }
    ];

    await SOS.insertMany(testRequests);
    console.log('Successfully seeded 4 test SOS requests in Maharashtra!');
    
    process.exit();
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seedTestSOS();
