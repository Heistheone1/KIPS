'use strict';

const odm = require('../lib/pg-odm');

const School = odm.defineModel('School', {
  defaults: {
    status: 'active',
    logoUrl: null,
    phone: null,
    address: null,
    email: null,
    reportHeader: {
      headmistressName: null,
      headmistressTitle: 'Headmistress',
      tagline: null,
      reportCity: 'KIGALI',
      stampLabel: 'Stamp and signature',
    },
  },
  indexes: [{ fields: { code: 1 }, unique: true }],
  refs: {},
  virtuals: {
    displayName: (data) => data.name || data.code || '',
  },
  statics: {
    STATUSES: ['active', 'inactive', 'suspended'],
  },
});

module.exports = School;
