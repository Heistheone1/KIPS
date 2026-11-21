'use strict';

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const optional = (name, defaultValue) => process.env[name] || defaultValue;

module.exports = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '5000'), 10),
  DATABASE_URL: optional('DATABASE_URL') || optional('POSTGRES_URI'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '8h'),
  COOKIE_SECRET: required('COOKIE_SECRET'),
  FRONTEND_ORIGIN: optional('FRONTEND_ORIGIN', 'http://localhost:3000'),
  BCRYPT_ROUNDS: parseInt(optional('BCRYPT_ROUNDS', '12'), 10),
};
