'use strict';

/**
 * Seed: KIPS Subjects
 * Creates all Nursery and Primary subjects for the KIPS school.
 *
 * Run: node utils/seedSubjects.js
 */

require('dotenv').config();
const odm = require('../lib/pg-odm');
const School = require('../models/School');
const User = require('../models/User');
const Subject = require('../models/Subject');

const NURSERY_SUBJECTS = [
  { name: 'Pré-lecture',            code: 'PRE-LECT',  description: 'Pre-reading activities' },
  { name: 'Pré-écriture',           code: 'PRE-ECR',   description: 'Pre-writing activities' },
  { name: 'Pré-calcul',             code: 'PRE-CALC',  description: 'Pre-mathematics activities' },
  { name: 'Coloriage',              code: 'COLOR',     description: 'Colouring activities' },
  { name: 'Français',               code: 'FR-NUR',    description: 'French language (Nursery)' },
  { name: 'Kinyarwanda',            code: 'KIN-NUR',   description: 'Kinyarwanda language (Nursery)' },
  { name: 'Découpage',              code: 'DECOUP',    description: 'Cutting activities' },
  { name: 'Collage',                code: 'COLLAGE',   description: 'Collage activities' },
  { name: 'Piquettage',             code: 'PIQUET',    description: 'Pricking activities' },
  { name: 'Act-sensorielles',       code: 'ACT-SENS',  description: 'Sensory activities' },
  { name: 'Act-psycho',             code: 'ACT-PSY',   description: 'Psychomotor activities' },
  { name: 'Activités-éxploratrices',code: 'ACT-EXPL',  description: 'Exploratory activities' },
  { name: 'Expression',             code: 'EXPR',      description: 'Expression activities' },
  { name: 'Peinture',               code: 'PEINT',     description: 'Painting activities' },
];

const PRIMARY_SUBJECTS = [
  { name: 'MATHEMATICS',    code: 'MATH',    description: 'Mathematics' },
  { name: 'ENGLISH',        code: 'ENG',     description: 'English language' },
  { name: 'SET & ICT',      code: 'SET-ICT', description: 'Science, Environment & Technology / ICT' },
  { name: 'SST & RS',       code: 'SST-RS',  description: 'Social Studies & Religious Studies' },
  { name: 'FRANCAIS',       code: 'FR-PRI',  description: 'French language (Primary)' },
  { name: 'CREATIVE ARTS',  code: 'CRE-ART', description: 'Creative Arts' },
  { name: 'P.E. & S (PES)', code: 'PES',     description: 'Physical Education & Sports' },
];

const run = async () => {
  await odm.connect();
  console.log('Connected to PostgreSQL\n');

  const school = await School.findOne({ code: 'KIPS' });
  if (!school) { console.error('KIPS school not found. Run seedKIPS.js first.'); process.exit(1); }
  console.log(`School: ${school.name}`);

  const admin = await User.findOne({ school: school._id, role: 'ADMIN' });
  if (!admin) { console.error('No ADMIN user found.'); process.exit(1); }
  console.log(`Admin:  ${admin.email}\n`);

  const seed = async (subjects, level) => {
    console.log(`── ${level} Subjects ──────────────────────────`);
    for (const s of subjects) {
      const existing = await Subject.findOne({ school: school._id, code: s.code });
      if (existing) {
        // Update level if missing
        if (!existing.level) {
          existing.level = level;
          await existing.save();
          console.log(`  ~ updated level: ${s.name} (${s.code})`);
        } else {
          console.log(`  - already exists: ${s.name} (${s.code})`);
        }
      } else {
        await Subject.create({
          school: school._id,
          name: s.name,
          code: s.code,
          description: s.description,
          level,
          status: 'ACTIVE',
          createdBy: admin._id,
        });
        console.log(`  ✓ created: ${s.name} (${s.code})`);
      }
    }
  };

  await seed(NURSERY_SUBJECTS, 'NURSERY');
  console.log();
  await seed(PRIMARY_SUBJECTS, 'PRIMARY');

  console.log('\n✅ Subjects seed complete!');
  console.log(`   Nursery subjects : ${NURSERY_SUBJECTS.length}`);
  console.log(`   Primary subjects : ${PRIMARY_SUBJECTS.length}`);
  console.log(`   Total            : ${NURSERY_SUBJECTS.length + PRIMARY_SUBJECTS.length}`);

  await odm.disconnect();
};

run().catch((err) => {
  console.error('Seed failed:', err.message, err.stack);
  process.exit(1);
});
