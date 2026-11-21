'use strict';
const odm = require('../lib/pg-odm');

module.exports = odm.defineModel('admin', {
  collection: 'legacy_admins',
  indexes: [
    { fields: { email: 1 }, unique: true },
    { fields: { schoolName: 1 }, unique: true },
  ],
  defaults: { role: 'Admin' },
  hidden: ['password'],
});
