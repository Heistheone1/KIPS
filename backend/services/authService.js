'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const School = require('../models/School');

/**
 * Issue a signed JWT for a user.
 * Payload contains only non-sensitive identity fields.
 */
const issueToken = (user) => {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    school: user.school.toString(),
  };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
};

/**
 * Verify a JWT and return the decoded payload.
 * Throws if invalid or expired.
 */
const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

/**
 * Authenticate a user by email and password.
 * Returns { user, token } on success.
 * Throws with a safe message on failure.
 */
const login = async (email, password) => {
  // Always select passwordHash explicitly (it is select:false on the schema)
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

  if (!user) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  if (user.status !== 'active') {
    throw Object.assign(new Error('Account is not active'), { statusCode: 403 });
  }

  const valid = await user.verifyPassword(password);
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  // Update last login timestamp
  user.lastLoginAt = new Date();
  await user.save();

  const token = issueToken(user);
  return { user, token };
};

/**
 * Load the full user from a verified JWT payload.
 * Used by the auth middleware after token verification.
 */
const getUserFromPayload = async (payload) => {
  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active') return null;

  if (user.school) {
    const school = await School.findById(user.school);
    const plain = user.toObject ? user.toObject() : user;
    return { ...plain, school: school || null };
  }
  return user;
};

module.exports = { issueToken, verifyToken, login, getUserFromPayload };
