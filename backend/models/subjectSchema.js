'use strict';
const odm = require('../lib/pg-odm');

module.exports = odm.defineModel('subject', {
  collection: 'legacy_subjects',
  refs: { sclassName: 'sclass', school: 'admin', teacher: 'teacher' },
});
