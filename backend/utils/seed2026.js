'use strict';

/**
 * Seed: Academic Year 2026-2027
 * Creates the academic year, 3 terms, and all 10 KIPS classes
 * for the existing KIPS school.
 *
 * Run: node utils/seed2026.js
 */

require('dotenv').config();
const odm = require('../lib/pg-odm');
const School = require('../models/School');
const User = require('../models/User');
const AcademicYear = require('../models/AcademicYear');
const Term = require('../models/Term');
const Class = require('../models/Class');

const YEAR_CODE = '2026-2027';
const YEAR_NAME = '2026-2027';

const TERMS = [
  { name: 'Term 1', code: 'T1-2627', sequence: 1, startDate: '2026-09-01', endDate: '2026-12-18' },
  { name: 'Term 2', code: 'T2-2627', sequence: 2, startDate: '2027-01-12', endDate: '2027-04-09' },
  { name: 'Term 3', code: 'T3-2627', sequence: 3, startDate: '2027-04-28', endDate: '2027-07-16' },
];

const CLASSES = [
  { name: 'Nursery 1',  code: 'N1',  level: 'NURSERY', section: 'N1',  capacity: 30, description: 'Nursery 1 class' },
  { name: 'Nursery 2',  code: 'N2',  level: 'NURSERY', section: 'N2',  capacity: 30, description: 'Nursery 2 class' },
  { name: 'Nursery 3',  code: 'N3',  level: 'NURSERY', section: 'N3',  capacity: 30, description: 'Nursery 3 class' },
  { name: 'Primary 1',  code: 'P1',  level: 'PRIMARY', section: 'P1',  capacity: 40, description: 'Primary 1 class' },
  { name: 'Primary 2',  code: 'P2',  level: 'PRIMARY', section: 'P2',  capacity: 40, description: 'Primary 2 class' },
  { name: 'Primary 3',  code: 'P3',  level: 'PRIMARY', section: 'P3',  capacity: 40, description: 'Primary 3 class' },
  { name: 'Primary 4',  code: 'P4',  level: 'PRIMARY', section: 'P4',  capacity: 40, description: 'Primary 4 class' },
  { name: 'Primary 5',  code: 'P5',  level: 'PRIMARY', section: 'P5',  capacity: 40, description: 'Primary 5 class' },
  { name: 'Primary 6A', code: 'P6A', level: 'PRIMARY', section: 'P6A', capacity: 40, description: 'Primary 6 Stream A' },
  { name: 'Primary 6B', code: 'P6B', level: 'PRIMARY', section: 'P6B', capacity: 40, description: 'Primary 6 Stream B' },
];

const run = async () => {
  await odm.connect();
  console.log('Connected to PostgreSQL\n');

  // ── School ──────────────────────────────────────────────────────────────────
  const school = await School.findOne({ code: 'KIPS' });
  if (!school) {
    console.error('KIPS school not found. Run seedKIPS.js first.');
    process.exit(1);
  }
  console.log(`School: ${school.name}`);

  // ── Admin (for createdBy) ───────────────────────────────────────────────────
  const admin = await User.findOne({ school: school._id, role: 'ADMIN' });
  if (!admin) {
    console.error('No ADMIN user found. Run seedKIPS.js first.');
    process.exit(1);
  }
  console.log(`Admin:  ${admin.email}\n`);

  // ── Academic Year ───────────────────────────────────────────────────────────
  let year = await AcademicYear.findOne({ school: school._id, code: YEAR_CODE });
  if (year) {
    console.log(`Academic year already exists: ${year.name}`);
  } else {
    year = await AcademicYear.create({
      school: school._id,
      name: YEAR_NAME,
      code: YEAR_CODE,
      startDate: '2026-09-01',
      endDate:   '2027-07-31',
      status: 'PLANNED',
      createdBy: admin._id,
    });
    console.log(`✓ Academic year created: ${year.name}`);
  }

  // ── Terms ───────────────────────────────────────────────────────────────────
  console.log('\nTerms:');
  for (const td of TERMS) {
    let term = await Term.findOne({ school: school._id, academicYear: year._id, code: td.code });
    if (term) {
      console.log(`  - ${td.name} already exists`);
    } else {
      term = await Term.create({
        school: school._id,
        academicYear: year._id,
        name: td.name,
        code: td.code,
        sequence: td.sequence,
        startDate: td.startDate,
        endDate: td.endDate,
        status: 'PLANNED',
        createdBy: admin._id,
      });
      console.log(`  ✓ ${term.name} created  (${td.startDate} → ${td.endDate})`);
    }
  }

  // ── Classes ─────────────────────────────────────────────────────────────────
  console.log('\nClasses:');
  for (const cd of CLASSES) {
    let cls = await Class.findOne({ school: school._id, academicYear: year._id, code: cd.code });
    if (cls) {
      console.log(`  - ${cd.name} (${cd.code}) already exists`);
    } else {
      cls = await Class.create({
        school: school._id,
        academicYear: year._id,
        name: cd.name,
        code: cd.code,
        level: cd.level,
        section: cd.section,
        capacity: cd.capacity,
        description: cd.description,
        status: 'ACTIVE',
        createdBy: admin._id,
      });
      console.log(`  ✓ ${cls.name} (${cls.code}) — ${cd.level} — capacity: ${cd.capacity}`);
    }
  }

  console.log('\n✅ 2026-2027 seed complete!');
  console.log(`   Academic Year : ${YEAR_NAME}`);
  console.log(`   Terms         : Term 1, Term 2, Term 3`);
  console.log(`   Classes       : N1, N2, N3, P1, P2, P3, P4, P5, P6A, P6B`);

  await odm.disconnect();
};

run().catch((err) => {
  console.error('Seed failed:', err.message, err.stack);
  process.exit(1);
});
