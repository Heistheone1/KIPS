'use strict';
const odm = require('../lib/pg-odm');

module.exports = odm.defineModel('sclass', {
  collection: 'legacy_sclasses',
  refs: { school: 'admin' },
});
