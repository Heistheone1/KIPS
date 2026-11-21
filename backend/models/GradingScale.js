'use strict';

const odm = require('../lib/pg-odm');

const GradingScale = odm.defineModel('GradingScale', {
  defaults: {
    name: 'Default',
    status: 'ACTIVE',
    bands: [],
  },
  indexes: [{ fields: { school: 1, academicYear: 1, name: 1 }, unique: true }],
  refs: {
    school: 'School',
    academicYear: 'AcademicYear',
    createdBy: 'User',
    updatedBy: 'User',
  },
  statics: {
    STATUSES: ['ACTIVE', 'INACTIVE'],
  },
});

module.exports = GradingScale;
