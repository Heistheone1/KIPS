'use strict';
require('dotenv').config();
const odm = require('./lib/pg-odm');
const User = require('./models/User');

(async () => {
  await odm.connect();
  const user = await User.findOne({ email: 'admin@kipsschool.ac' }).select('+passwordHash');
  console.log('User found:', !!user);
  if (user) {
    console.log('Email:', user.email, 'Role:', user.role, 'Status:', user.status);
    console.log('PasswordHash:', user.passwordHash ? user.passwordHash.substring(0, 30) + '...' : 'NULL');
    
    // Test password verification
    const testPasses = ['replace_with_strong_password', 'KipsAdmin2024!', 'admin123', 'password'];
    for (const p of testPasses) {
      const valid = await user.verifyPassword(p);
      console.log(`  Password "${p}": ${valid}`);
    }
  }
  await odm.disconnect();
})();
