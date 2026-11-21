'use strict';

const odm = require('../lib/pg-odm');

const Class = odm.defineModel('Class', {
  defaults: {
    status: 'ACTIVE',
    stream: null,
    capacity: null,
    description: null,
    section: null,
    level: 'PRIMARY',
  },
  indexes: [{ fields: { school: 1, academicYear: 1, code: 1 }, unique: true }],
  refs: {
    school: 'School',
    academicYear: 'AcademicYear',
    createdBy: 'User',
  },
  statics: {
    STATUSES: ['ACTIVE', 'INACTIVE', 'CLOSED'],
    // Predefined KIPS class templates
    KIPS_CLASSES: [
      { name: 'Nursery 1',  code: 'N1',  level: 'NURSERY',  section: 'N1',  capacity: 30 },
      { name: 'Nursery 2',  code: 'N2',  level: 'NURSERY',  section: 'N2',  capacity: 30 },
      { name: 'Nursery 3',  code: 'N3',  level: 'NURSERY',  section: 'N3',  capacity: 30 },
      { name: 'Primary 1',  code: 'P1',  level: 'PRIMARY',  section: 'P1',  capacity: 40 },
      { name: 'Primary 2',  code: 'P2',  level: 'PRIMARY',  section: 'P2',  capacity: 40 },
      { name: 'Primary 3',  code: 'P3',  level: 'PRIMARY',  section: 'P3',  capacity: 40 },
      { name: 'Primary 4',  code: 'P4',  level: 'PRIMARY',  section: 'P4',  capacity: 40 },
      { name: 'Primary 5',  code: 'P5',  level: 'PRIMARY',  section: 'P5',  capacity: 40 },
      { name: 'Primary 6A', code: 'P6A', level: 'PRIMARY',  section: 'P6A', capacity: 40 },
      { name: 'Primary 6B', code: 'P6B', level: 'PRIMARY',  section: 'P6B', capacity: 40 },
    ],
  },
});

module.exports = Class;
