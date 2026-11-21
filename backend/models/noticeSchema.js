'use strict';
const odm = require('../lib/pg-odm');

module.exports = odm.defineModel('notice', {
  collection: 'legacy_notices',
  refs: { school: 'admin' },
});
