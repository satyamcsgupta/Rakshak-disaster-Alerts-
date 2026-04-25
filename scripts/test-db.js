require('dotenv').config();
const mongoose = require('mongoose');

const testConn = async () => {
  console.log('Testing connection to:', process.env.MONGO_URI.replace(/:([^@]+)@/, ':****@')); // Hide password in logs
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Success! Connected to MongoDB Atlas.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection Failed!');
    console.error('Error Name:', err.name);
    console.error('Error Message:', err.message);
    if (err.reason) console.error('Reason:', err.reason);
    process.exit(1);
  }
};

testConn();
