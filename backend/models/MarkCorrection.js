'use strict';

const odm = require('../lib/pg-odm');

const MarkCorrection = odm.defineModel('MarkCorrection', {
  immutable: true,
  defaults: {
    reason: null,
  },
  indexes: [{ fields: { assessment: 1, student: 1, correctedAt: 1 } }],
  refs: {
    school: 'School',
    assessment: 'Assessment',
    student: 'Student',
    correctedBy: 'User',
  },
});

module.exports = MarkCorrection;
