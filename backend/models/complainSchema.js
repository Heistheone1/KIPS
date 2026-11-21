'use strict';
const odm = require('../lib/pg-odm');

module.exports = odm.defineModel('complain', {
  collection: 'legacy_complains',
  refs: { user: 'student', school: 'admin' },
});
