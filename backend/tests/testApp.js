'use strict';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/kips_sms_test';
process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_characters_long_x';
process.env.JWT_EXPIRES_IN = '1h';
process.env.COOKIE_SECRET = 'test_cookie_secret_at_least_32_characters_x';
process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
process.env.BCRYPT_ROUNDS = '4';

const express = require('express');
const {
  helmetMiddleware,
  cookieMiddleware,
  corsMiddleware,
} = require('../middleware/security');
const { errorHandler, notFound } = require('../middleware/errorHandler');
const authRoutes = require('../routes/authRoutes');
const userRoutes = require('../routes/userRoutes');
const schoolRoutes = require('../routes/schoolRoutes');
const academicRoutes = require('../routes/academicRoutes');
const assessmentRoutes = require('../routes/assessmentRoutes');
const resultRoutes = require('../routes/resultRoutes');
const reportRoutes = require('../routes/reportRoutes');

const buildApp = () => {
  const app = express();
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.options('*', corsMiddleware);
  app.use(cookieMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/schools', schoolRoutes);
  app.use('/api', academicRoutes);
  app.use('/api', assessmentRoutes);
  app.use('/api', resultRoutes);
  app.use('/api', reportRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
};

module.exports = { buildApp };
