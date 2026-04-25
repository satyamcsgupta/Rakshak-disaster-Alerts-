require('dotenv').config();
const mongoose = require('mongoose');
const Alert = require('../models/Alert');
const Resource = require('../models/Resource');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/idealab2';

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Alert.deleteMany({});
    await Resource.deleteMany({});
    console.log('Cleared existing Alerts and Resources');

    // 1. Seed Alerts (Red Dots)
    const testAlerts = [
      {
        title: 'Severe Urban Flooding',
        disasterType: 'Flood',
        state: 'Maharashtra',
        severity: 'High',
        latitude: 19.0760,
        longitude: 72.8777,
        messageEnglish: 'Heavy rainfall causing waterlogging in low-lying areas. Avoid travel.',
        messageHindi: 'निचले इलाकों में जलजमाव के कारण भारी बारिश। यात्रा से बचें।',
        messageMarathi: 'सखल भागात पाणी साचल्याने मुसळधार पाऊस. प्रवास टाळा.',
        precautions: 'Stay indoors, keep emergency kits ready, follow official updates.'
      },
      {
        title: 'Cyclone Warning',
        disasterType: 'Cyclone',
        state: 'Maharashtra',
        severity: 'Medium',
        latitude: 18.9220,
        longitude: 72.8347,
        messageEnglish: 'Cyclone expected to hit the coast within 24 hours. High winds possible.',
        messageHindi: '24 घंटे के भीतर चक्रवात तट से टकराने की आशंका। तेज हवाएं चल सकती हैं।',
        messageMarathi: 'येत्या २४ तासात चक्रीवादळ किनारपट्टीवर धडकण्याची शक्यता आहे. सोसाट्याचा वारा सुटू शकतो.',
        precautions: 'Secure loose objects, move to safe shelters if advised.'
      }
    ];

    // 2. Seed Resources (Safe Zone Pins)
    const testResources = [
      {
        name: 'Mumbai Central Shelter',
        type: 'Shelter',
        state: 'Maharashtra',
        address: 'Churchgate Area',
        latitude: 18.9322,
        longitude: 72.8264,
        capacity: '500 People',
        contactPhone: '022-1234567',
        isActive: true
      },
      {
        name: 'Emergency Medical Hospital',
        type: 'Hospital',
        state: 'Maharashtra',
        address: 'Dadar West',
        latitude: 19.0178,
        longitude: 72.8478,
        capacity: '100 Beds',
        contactPhone: '022-9876543',
        isActive: true
      },
      {
        name: 'Safe Water Distribution',
        type: 'Water',
        state: 'Maharashtra',
        address: 'Worli Point',
        latitude: 19.0000,
        longitude: 72.8170,
        capacity: '5000 Liters/day',
        contactPhone: '022-5556667',
        isActive: true
      }
    ];

    await Alert.insertMany(testAlerts);
    await Resource.insertMany(testResources);

    console.log('Successfully seeded 2 Alerts (Red Dots) and 3 Resources (Safe Zones)!');
    process.exit();
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seedData();
