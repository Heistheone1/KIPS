'use strict';
const odm = require('../lib/pg-odm');

module.exports = odm.defineModel('student', {
  collection: 'legacy_students',
  defaults: { role: 'Student', examResult: [], attendance: [] },
  refs: { sclassName: 'sclass', school: 'admin' },
  hidden: ['password'],
});
