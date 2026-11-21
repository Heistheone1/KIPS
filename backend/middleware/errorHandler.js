'use strict';

const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  const isDev = env.NODE_ENV === 'development';

  // Mongoose cast error (invalid ObjectId) — must be checked before statusCode
  // derivation so it is never logged or treated as a 500 server failure
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Validation failed', errors: messages });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ message: `${field} already exists` });
  }

  const statusCode = err.statusCode || err.status || 500;

  // Log unexpected server errors only
  if (statusCode >= 500) {
    console.error('[Error]', err);
  }

  res.status(statusCode).json({
    message: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
};

const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

module.exports = { errorHandler, notFound };
