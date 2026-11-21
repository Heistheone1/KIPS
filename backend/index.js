'use strict';

require('dotenv').config();

const env = require('./config/env');
const { connect } = require('./config/database');

const express = require('express');
const {
  helmetMiddleware,
  cookieMiddleware,
  corsMiddleware,
  apiRateLimiter,
} = require('./middleware/security');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const academicRoutes = require('./routes/academicRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const resultRoutes = require('./routes/resultRoutes');
const reportRoutes = require('./routes/reportRoutes');
const searchRoutes = require('./routes/searchRoutes');
const legacyRoutes = require('./routes/route');

const app = express();

// Security headers
app.use(helmetMiddleware);

// CORS — must come before cookie parser and routes
app.use(corsMiddleware);
app.options('*', corsMiddleware);

// Cookie parser — signed cookies require COOKIE_SECRET
app.use(cookieMiddleware);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// General rate limiting
app.use('/api', apiRateLimiter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', env: env.NODE_ENV }));

// Domain routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api', academicRoutes);
app.use('/api', assessmentRoutes);
app.use('/api', resultRoutes);
app.use('/api', reportRoutes);
app.use('/api', searchRoutes);
app.use('/api', legacyRoutes);

// 404 handler
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

const start = async () => {
  await connect();
  app.listen(env.PORT, () => {
    console.log(`KIPS-SMS backend running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
};

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
}

module.exports = app;
