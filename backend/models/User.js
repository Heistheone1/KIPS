'use strict';

const bcrypt = require('bcrypt');
const env = require('../config/env');
const odm = require('../lib/pg-odm');

const HASHED = /^\$2[aby]\$/;

const User = odm.defineModel('User', {
  defaults: {
    status: 'active',
    phone: null,
    lastLoginAt: null,
  },
  indexes: [{ fields: { email: 1 }, unique: true }],
  refs: {
    school: 'School',
  },
  hidden: ['passwordHash'],
  virtuals: {
    fullName: (data) => [data.firstName, data.lastName].filter(Boolean).join(' ').trim(),
  },
  methods: {
    async verifyPassword(password) {
      if (!this.passwordHash) return false;
      return bcrypt.compare(password, this.passwordHash);
    },
    toSafeObject() {
      const data = this.toObject();
      const safe = {
        _id: data._id,
        school: data.school,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: [data.firstName, data.lastName].filter(Boolean).join(' ').trim(),
        email: data.email,
        phone: data.phone,
        role: data.role,
        status: data.status,
        lastLoginAt: data.lastLoginAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      return safe;
    },
  },
  statics: {
    ROLES: ['ADMIN', 'DOS', 'CLASS_TEACHER', 'TEACHER'],
    STATUSES: ['active', 'inactive', 'suspended'],
  },
  async preSave(doc) {
    if (doc.isModified('passwordHash')) {
      const raw = doc.passwordHash;
      if (typeof raw === 'string' && raw && !HASHED.test(raw)) {
        doc.passwordHash = await bcrypt.hash(raw, env.BCRYPT_ROUNDS);
      }
    }
  },
});

module.exports = User;
