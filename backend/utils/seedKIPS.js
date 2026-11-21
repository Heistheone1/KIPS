'use strict';

/**
 * KIPS Full Seed — creates school, admin, academic year, 3 terms,
 * all classes (N1,N2,N3,P1,P2,P3,P4,P5,P6A,P6B), subjects per level,
 * sample students with enrollments, assessments and marks.
 *
 * Run: node utils/seedKIPS.js
 */

require('dotenv').config();
const odm = require('../lib/pg-odm');
const School = require('../models/School');
const User = require('../models/User');
const AcademicYear = require('../models/AcademicYear');
const Term = require('../models/Term');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Enrollment = require('../models/Enrollment');
const Assessment = require('../models/Assessment');
const AssessmentMark = require('../models/AssessmentMark');

// ─── Subject definitions ────────────────────────────────────────────────────

const NURSERY_SUBJECTS = [
  'Pré-lecture', 'Pré-écriture', 'Pré-calcul', 'Coloriage',
  'Français', 'Kinyarwanda', 'Découpage', 'Collage',
  'Piquettage', 'Act-sensorielles', 'Act-psycho',
  'Activités-éxploratrices', 'Expression', 'Peinture',
];

const PRIMARY_SUBJECTS = [
  'BEHAVIOUR', 'MATHEMATICS', 'ENGLISH', 'SET & ICT',
  'SST&RS', 'KINYARWANDA', 'FRANCAIS', 'CREATIVE ARTS', 'PH.E.S(PES)',
];

// ─── Class definitions ──────────────────────────────────────────────────────

const CLASSES = [
  { name: 'N1 - NURSERY', code: 'N1', level: 'NURSERY' },
  { name: 'N2 - NURSERY', code: 'N2', level: 'NURSERY' },
  { name: 'N3 - NURSERY', code: 'N3', level: 'NURSERY' },
  { name: 'P1 - PRIMARY', code: 'P1', level: 'PRIMARY' },
  { name: 'P2 - PRIMARY', code: 'P2', level: 'PRIMARY' },
  { name: 'P3 - PRIMARY', code: 'P3', level: 'PRIMARY' },
  { name: 'P4 - PRIMARY', code: 'P4', level: 'PRIMARY' },
  { name: 'P5 - PRIMARY', code: 'P5', level: 'PRIMARY' },
  { name: 'P6 A - PRIMARY', code: 'P6A', level: 'PRIMARY' },
  { name: 'P6 B - PRIMARY', code: 'P6B', level: 'PRIMARY' },
];

// ─── Sample students per class (3 per class) ────────────────────────────────

const STUDENTS_PER_CLASS = {
  N1: [
    { firstName: 'Amina',    lastName: 'Uwimana',   admissionNumber: 'N1-001' },
    { firstName: 'Blaise',   lastName: 'Nkurunziza',admissionNumber: 'N1-002' },
    { firstName: 'Clarisse', lastName: 'Mukamana',  admissionNumber: 'N1-003' },
  ],
  N2: [
    { firstName: 'David',    lastName: 'Habimana',  admissionNumber: 'N2-001' },
    { firstName: 'Elise',    lastName: 'Nyiraneza',  admissionNumber: 'N2-002' },
    { firstName: 'Fabrice',  lastName: 'Bizimana',  admissionNumber: 'N2-003' },
  ],
  N3: [
    { firstName: 'Ikirezi',  lastName: 'Lakeisha',  admissionNumber: 'N3-001', middleName: 'Audrey' },
    { firstName: 'Grace',    lastName: 'Uwase',     admissionNumber: 'N3-002' },
    { firstName: 'Herve',    lastName: 'Nshimiyimana', admissionNumber: 'N3-003' },
  ],
  P1: [
    { firstName: 'Innocent', lastName: 'Mugisha',   admissionNumber: 'P1-001' },
    { firstName: 'Josiane',  lastName: 'Umubyeyi',  admissionNumber: 'P1-002' },
    { firstName: 'Kevin',    lastName: 'Ndayishimiye', admissionNumber: 'P1-003' },
  ],
  P2: [
    { firstName: 'Laetitia', lastName: 'Mukeshimana', admissionNumber: 'P2-001' },
    { firstName: 'Marcel',   lastName: 'Niyonzima', admissionNumber: 'P2-002' },
    { firstName: 'Nadine',   lastName: 'Uwimana',   admissionNumber: 'P2-003' },
  ],
  P3: [
    { firstName: 'Olivier',  lastName: 'Habimana',  admissionNumber: 'P3-001' },
    { firstName: 'Patricia', lastName: 'Nyiramana', admissionNumber: 'P3-002' },
    { firstName: 'Quentin',  lastName: 'Bizimungu', admissionNumber: 'P3-003' },
  ],
  P4: [
    { firstName: 'Rachel',   lastName: 'Mukamana',  admissionNumber: 'P4-001' },
    { firstName: 'Samuel',   lastName: 'Nkurunziza',admissionNumber: 'P4-002' },
    { firstName: 'Therese',  lastName: 'Uwase',     admissionNumber: 'P4-003' },
  ],
  P5: [
    { firstName: 'Ursula',   lastName: 'Niyonzima', admissionNumber: 'P5-001' },
    { firstName: 'Victor',   lastName: 'Habimana',  admissionNumber: 'P5-002' },
    { firstName: 'Winnie',   lastName: 'Mukeshimana', admissionNumber: 'P5-003' },
  ],
  P6A: [
    { firstName: 'Umutesi',  lastName: 'Ngarambe',  admissionNumber: 'KIPS-200', middleName: 'keza noella' },
    { firstName: 'Xavier',   lastName: 'Nshimiyimana', admissionNumber: 'P6A-002' },
    { firstName: 'Yvonne',   lastName: 'Umubyeyi',  admissionNumber: 'P6A-003' },
  ],
  P6B: [
    { firstName: 'Zacharie', lastName: 'Ndayishimiye', admissionNumber: 'P6B-001' },
    { firstName: 'Aline',    lastName: 'Mukamana',  admissionNumber: 'P6B-002' },
    { firstName: 'Bernard',  lastName: 'Niyonzima', admissionNumber: 'P6B-003' },
  ],
};

// ─── Mark helpers ───────────────────────────────────────────────────────────

const rnd = (min, max) => Math.round((Math.random() * (max - min) + min) * 10) / 10;

const primaryMarks = () => ({ test: rnd(70, 100), exam: rnd(70, 100) });
const nurseryPct   = () => rnd(50, 100);

// ─── Main ───────────────────────────────────────────────────────────────────

const run = async () => {
  await odm.connect();
  console.log('Connected to PostgreSQL');

  // ── School ──────────────────────────────────────────────────────────────
  let school = await School.findOne({ code: 'KIPS' });
  if (!school) {
    school = await School.create({
      name: 'KIGALI ILMU PARENTS\' SCHOOL ( KIPS )',
      code: 'KIPS',
      email: 'Kigalilmuschool123@gmail.com',
      phone: '0788436109/0783655381/0788832422',
      address: 'NYAKARIBA VILLAGE, MUSEZERO CELL, GISOZI SECTOR, GASABO DISTRICT, CITY OF KIGALI',
      logoUrl: null,
      reportHeader: {
        headmistressName: 'Ms. NIYONSABA Marie Rose',
        headmistressTitle: 'Headmistress',
        tagline: 'NYAKARIBA VILLAGE, MUSEZERO CELL, GISOZI SECTOR, GASABO DISTRICT, CITY OF KIGALI',
        reportCity: 'KIGALI',
        stampLabel: 'Stamp and signature',
      },
    });
    console.log('School created:', school.name);
  } else {
    console.log('School exists:', school.name);
  }

  // ── Admin user ──────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@kipsschool.ac';
  let admin = await User.findOne({ email: adminEmail.toLowerCase() });
  if (!admin) {
    admin = new User({
      school: school._id,
      firstName: process.env.SEED_ADMIN_FIRST_NAME || 'KIPS',
      lastName: process.env.SEED_ADMIN_LAST_NAME || 'Admin',
      email: adminEmail,
      passwordHash: process.env.SEED_ADMIN_PASSWORD || 'KipsAdmin2024!',
      role: 'ADMIN',
      status: 'active',
    });
    await admin.save();
    console.log('Admin created:', admin.email);
  } else {
    console.log('Admin exists:', admin.email);
  }

  // ── Academic Year ────────────────────────────────────────────────────────
  let year = await AcademicYear.findOne({ school: school._id, code: '2025-2026' });
  if (!year) {
    year = await AcademicYear.create({
      school: school._id,
      name: '2025-2026',
      code: '2025-2026',
      status: 'ACTIVE',
      createdBy: admin._id,
    });
    console.log('Academic year created:', year.name);
  }

  // ── Terms ────────────────────────────────────────────────────────────────
  const termDefs = [
    { name: 'Term 1', code: 'T1', sequence: 1 },
    { name: 'Term 2', code: 'T2', sequence: 2 },
    { name: 'Term 3', code: 'T3', sequence: 3 },
  ];
  const terms = [];
  for (const td of termDefs) {
    let t = await Term.findOne({ school: school._id, academicYear: year._id, code: td.code });
    if (!t) {
      t = await Term.create({
        school: school._id, academicYear: year._id,
        name: td.name, code: td.code, sequence: td.sequence,
        status: 'ACTIVE', createdBy: admin._id,
      });
      console.log('Term created:', t.name);
    }
    terms.push(t);
  }

  // ── Subjects ─────────────────────────────────────────────────────────────
  const subjectMap = new Map(); // code -> subject doc
  const allSubjectNames = [...new Set([...NURSERY_SUBJECTS, ...PRIMARY_SUBJECTS])];
  for (const name of allSubjectNames) {
    const code = name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().slice(0, 20);
    let subj = await Subject.findOne({ school: school._id, code });
    if (!subj) {
      subj = await Subject.create({
        school: school._id, name, code, status: 'ACTIVE', createdBy: admin._id,
      });
      console.log('Subject created:', subj.name);
    }
    subjectMap.set(code, subj);
  }

  const getSubj = (name) => {
    const code = name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().slice(0, 20);
    return subjectMap.get(code);
  };

  // ── Classes + Students + Enrollments + Assessments + Marks ───────────────
  for (const clsDef of CLASSES) {
    // Class
    let cls = await Class.findOne({ school: school._id, academicYear: year._id, code: clsDef.code });
    if (!cls) {
      cls = await Class.create({
        school: school._id, academicYear: year._id,
        name: clsDef.name, code: clsDef.code,
        status: 'ACTIVE', createdBy: admin._id,
      });
      console.log('Class created:', cls.name);
    }

    const isNursery = clsDef.level === 'NURSERY';
    const subjectNames = isNursery ? NURSERY_SUBJECTS : PRIMARY_SUBJECTS;

    // Assessments per subject per term
    const assessmentMap = new Map(); // `${termId}:${subjId}` -> [testAssessment, examAssessment]
    for (const term of terms) {
      for (const subjName of subjectNames) {
        const subj = getSubj(subjName);
        if (!subj) continue;
        const key = `${term._id}:${subj._id}`;

        if (isNursery) {
          // Nursery: single assessment (percentage/rank)
          let a = await Assessment.findOne({
            school: school._id, academicYear: year._id, term: term._id,
            class: cls._id, subject: subj._id, name: 'Rank',
          });
          if (!a) {
            a = await Assessment.create({
              school: school._id, academicYear: year._id, term: term._id,
              class: cls._id, subject: subj._id,
              name: 'Rank', type: 'EXAM', maxMarks: 100, weight: 100,
              status: 'ACTIVE', createdBy: admin._id,
            });
          }
          assessmentMap.set(key, [a]);
        } else {
          // Primary: TEST (max 100) + EXAM (max 100)
          const isBeh = /behaviour|conduite/i.test(subjName);
          let aTest, aExam;
          if (!isBeh) {
            aTest = await Assessment.findOne({
              school: school._id, academicYear: year._id, term: term._id,
              class: cls._id, subject: subj._id, name: 'Test',
            });
            if (!aTest) {
              aTest = await Assessment.create({
                school: school._id, academicYear: year._id, term: term._id,
                class: cls._id, subject: subj._id,
                name: 'Test', type: 'TEST', maxMarks: 100, weight: 50,
                status: 'ACTIVE', createdBy: admin._id,
              });
            }
          }
          aExam = await Assessment.findOne({
            school: school._id, academicYear: year._id, term: term._id,
            class: cls._id, subject: subj._id, name: 'Exam',
          });
          if (!aExam) {
            aExam = await Assessment.create({
              school: school._id, academicYear: year._id, term: term._id,
              class: cls._id, subject: subj._id,
              name: 'Exam', type: 'EXAM',
              maxMarks: isBeh ? 40 : 100,
              weight: isBeh ? 100 : 50,
              status: 'ACTIVE', createdBy: admin._id,
            });
          }
          assessmentMap.set(key, isBeh ? [aExam] : [aTest, aExam]);
        }
      }
    }

    // Students
    const studentDefs = STUDENTS_PER_CLASS[clsDef.code] || [];
    for (const sd of studentDefs) {
      let student = await Student.findOne({ school: school._id, admissionNumber: sd.admissionNumber });
      if (!student) {
        student = await Student.create({
          school: school._id,
          firstName: sd.firstName,
          middleName: sd.middleName || null,
          lastName: sd.lastName,
          admissionNumber: sd.admissionNumber,
          status: 'ACTIVE',
          createdBy: admin._id,
        });
        console.log('Student created:', student.admissionNumber, student.firstName, student.lastName);
      }

      // Enrollment
      let enr = await Enrollment.findOne({
        school: school._id, academicYear: year._id, class: cls._id, student: student._id,
      });
      if (!enr) {
        enr = await Enrollment.create({
          school: school._id, academicYear: year._id, class: cls._id, student: student._id,
          status: 'ACTIVE', createdBy: admin._id,
        });
      }

      // Marks
      for (const term of terms) {
        for (const subjName of subjectNames) {
          const subj = getSubj(subjName);
          if (!subj) continue;
          const key = `${term._id}:${subj._id}`;
          const assessments = assessmentMap.get(key) || [];

          for (const assessment of assessments) {
            const existing = await AssessmentMark.findOne({
              school: school._id, assessment: assessment._id, student: student._id,
            });
            if (!existing) {
              let score;
              if (isNursery) {
                score = nurseryPct();
              } else {
                const isBeh = /behaviour|conduite/i.test(subjName);
                if (isBeh) {
                  score = rnd(25, 40);
                } else {
                  score = assessment.name === 'Test' ? rnd(70, 100) : rnd(70, 100);
                }
              }
              await AssessmentMark.create({
                school: school._id,
                academicYear: year._id,
                term: term._id,
                class: cls._id,
                subject: subj._id,
                assessment: assessment._id,
                student: student._id,
                score,
                entered: true,
                recordedBy: admin._id,
              });
            }
          }
        }
      }
    }
  }

  console.log('\n✅ KIPS seed complete!');
  console.log(`   Admin login: ${adminEmail}`);
  console.log(`   Password:    ${process.env.SEED_ADMIN_PASSWORD || 'KipsAdmin2024!'}`);
  await odm.disconnect();
};

run().catch((err) => {
  console.error('Seed failed:', err.message, err.stack);
  process.exit(1);
});
