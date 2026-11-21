'use strict';

/**
 * Seed script — creates the initial School and ADMIN user.
 * Run once: node utils/seedAdmin.js
 *
 * Reads from environment variables — never hardcodes credentials.
 * Will not overwrite an existing admin with the same email.
 */

require('dotenv').config();
const mongoose = require('../lib/pg-odm');
const env = require('../config/env');
const School = require('../models/School');
const User = require('../models/User');

const run = async () => {
  await mongoose.connect();
  console.log('Connected to PostgreSQL');

  const {
    SEED_SCHOOL_NAME,
    SEED_SCHOOL_CODE,
    SEED_SCHOOL_EMAIL,
    SEED_ADMIN_FIRST_NAME,
    SEED_ADMIN_LAST_NAME,
    SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD,
  } = process.env;

  const required = [
    'SEED_SCHOOL_NAME', 'SEED_SCHOOL_CODE', 'SEED_SCHOOL_EMAIL',
    'SEED_ADMIN_FIRST_NAME', 'SEED_ADMIN_LAST_NAME',
    'SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      console.error(`Missing required seed variable: ${key}`);
      process.exit(1);
    }
  }

  // Create school if it doesn't exist
  let school = await School.findOne({ code: SEED_SCHOOL_CODE });
  if (!school) {
    school = await School.create({
      name: SEED_SCHOOL_NAME,
      code: SEED_SCHOOL_CODE,
      email: SEED_SCHOOL_EMAIL,
    });
    console.log(`School created: ${school.name} (${school.code})`);
  } else {
    console.log(`School already exists: ${school.name}`);
  }

  // Create admin if they don't exist
  const existing = await User.findOne({ email: SEED_ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    console.log(`Admin already exists: ${existing.email}`);
    await mongoose.disconnect();
    return;
  }

  const admin = new User({
    school: school._id,
    firstName: SEED_ADMIN_FIRST_NAME,
    lastName: SEED_ADMIN_LAST_NAME,
    email: SEED_ADMIN_EMAIL,
    passwordHash: SEED_ADMIN_PASSWORD,
    role: 'ADMIN',
    status: 'active',
  });

  await admin.save();
  console.log(`ADMIN created: ${admin.email}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
