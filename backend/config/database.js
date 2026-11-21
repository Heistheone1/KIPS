'use strict';

const odm = require('../lib/pg-odm');

/**
 * Connect to PostgreSQL (JSONB document store).
 * Kept as a small wrapper so index.js stays storage-agnostic.
 */
const connect = async () => {
  await odm.connect();
  console.log('PostgreSQL connected');
  return odm;
};

module.exports = {
  connect,
  getConnection: () => odm,
};
