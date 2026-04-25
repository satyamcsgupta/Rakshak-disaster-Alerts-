const bcrypt = require('bcryptjs');
const User = require('../models/User');

const ensureDefaultAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@disasterhelp.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) return;

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await User.create({
    name: 'System Admin',
    email: adminEmail,
    phone: '9999999999',
    password: hashedPassword,
    state: 'Maharashtra',
    city: 'Mumbai',
    language: 'English',
    role: 'admin'
  });

  console.log(`Default admin created: ${adminEmail}`);
};

module.exports = ensureDefaultAdmin;
