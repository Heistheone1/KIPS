'use strict';
const odm = require('../lib/pg-odm');

module.exports = odm.defineModel('teacher', {
  collection: 'legacy_teachers',
  defaults: { role: 'Teacher', attendance: [] },
  refs: { school: 'admin', teachSubject: 'subject', teachSclass: 'sclass' },
  hidden: ['password'],
});
