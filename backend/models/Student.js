'use strict';

const odm = require('../lib/pg-odm');

const Student = odm.defineModel('Student', {
  defaults: {
    status: 'ACTIVE',
    middleName: null,
    gender: null,
    dateOfBirth: null,
    guardianName: null,
    guardianPhone: null,
    guardianEmail: null,
    address: null,
  },
  indexes: [{ fields: { school: 1, admissionNumber: 1 }, unique: true }],
  refs: {
    school: 'School',
    createdBy: 'User',
  },
  virtuals: {
    fullName: (data) =>
      [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ').trim(),
  },
  statics: {
    STATUSES: ['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN'],
  },
});

module.exports = Student;
