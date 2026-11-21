'use strict';

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const env = require('../config/env');

// Helmet — sets secure HTTP headers
const helmetMiddleware = helmet();

// Cookie parser — signed cookies use COOKIE_SECRET
const cookieMiddleware = cookieParser(env.COOKIE_SECRET);

// CORS — only allow the configured frontend origin, with credentials
const corsMiddleware = cors({
  origin: env.FRONTEND_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  credentials: true,
  optionsSuccessStatus: 200,
});

// Rate limiter for authentication endpoints — 10 attempts per 15 minutes per IP
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' },
  skipSuccessfulRequests: false,
});

// General API rate limiter — 200 requests per minute per IP
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
});

module.exports = {
  helmetMiddleware,
  cookieMiddleware,
  corsMiddleware,
  authRateLimiter,
  apiRateLimiter,
};
