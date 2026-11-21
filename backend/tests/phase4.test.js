'use strict';

/**
 * KIPS-SMS Phase 4 — Authoritative Results, Cumulative Calculations, Rankings
 *
 * Covers: result validators, grade resolution (boundaries/gaps), ranking
 *         (competition ties, determinism), weight validation, term windows
 *         (TERM/CUMULATIVE/ANNUAL), missing-mark policies, stale invalidation,
 *         snapshot immutability, grading scales, HTTP permission enforcement.
 *
 * Integration sections run against a real standalone PostgreSQL
 * (kips_sms_test_p4); HTTP sections mock services like phases 2-3.
 */

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/kips_sms_test_p4';
process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_characters_long_x';
process.env.JWT_EXPIRES_IN = '1h';
process.env.COOKIE_SECRET = 'test_cookie_secret_at_least_32_characters_x';
process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
process.env.BCRYPT_ROUNDS = '4';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const odm = require('../lib/pg-odm');
const { ObjectId } = odm.Types;

jest.mock('../services/authService', () => {
  const actual = jest.requireActual('../services/authService');
  return { ...actual, getUserFromPayload: jest.fn(), login: jest.fn() };
});

jest.mock('../models/AuditLog', () => ({ create: jest.fn().mockResolvedValue({}), index: jest.fn() }));

const authService = require('../services/authService');
const AuditLog = require('../models/AuditLog');
const { buildApp } = require('./testApp');

// ─── HTTP helpers (same shape as phases 2-3) ───────────────────────────────

const SECRET = process.env.JWT_SECRET;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
const AUTH_COOKIE = 'kips_auth';
const CSRF_SECRET_COOKIE = 'kips_csrf_secret';

const USER_ID = '64a000000000000000000001';
const SCHOOL_ID = '64a000000000000000000099';

const makeUser = (overrides = {}) => ({
  _id: USER_ID,
  school: { _id: SCHOOL_ID, name: 'KIPS School', code: 'KIPS', status: 'active' },
  firstName: 'Test', lastName: 'User',
  email: 'test@kips.ac',
  role: 'ADMIN',
  status: 'active',
  toSafeObject() { return { _id: this._id, school: this.school, role: this.role }; },
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const issueToken = (role = 'ADMIN', userId = USER_ID) =>
  jwt.sign({ sub: userId, role, school: SCHOOL_ID }, SECRET, { expiresIn: '1h' });

const signCookieValue = (val) => {
  const sig = require('crypto')
    .createHmac('sha256', COOKIE_SECRET)
    .update(val).digest('base64')
    .replace(/=+$/, '');
  return `s:${val}.${sig}`;
};

const makeAuthCookie = (token) => `${AUTH_COOKIE}=${signCookieValue(token)}`;

const getCsrf = async (app) => {
  const res = await request(app).get('/api/auth/csrf-token');
  return {
    csrfToken: res.body.csrfToken,
    csrfSecretCookie: (res.headers['set-cookie'] || []).find((c) => c.startsWith(CSRF_SECRET_COOKIE)),
  };
};

const authGet = async (app, url, role = 'ADMIN', userId = USER_ID) => {
  authService.getUserFromPayload.mockResolvedValue(makeUser({ role, _id: userId }));
  const token = issueToken(role, userId);
  return request(app).get(url).set('Cookie', makeAuthCookie(token));
};

const authPost = async (app, url, body, role = 'ADMIN', userId = USER_ID) => {
  authService.getUserFromPayload.mockResolvedValue(makeUser({ role, _id: userId }));
  const token = issueToken(role, userId);
  const { csrfToken, csrfSecretCookie } = await getCsrf(app);
  return request(app)
    .post(url)
    .set('Cookie', [makeAuthCookie(token), csrfSecretCookie].filter(Boolean).join('; '))
    .set('x-csrf-token', csrfToken)
    .send(body);
};

beforeEach(() => {
  authService.getUserFromPayload.mockReset();
  AuditLog.create.mockReset();
  AuditLog.create.mockResolvedValue({});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Real PostgreSQL shared by all integration describes in this file.
// File scope (not describe scope) so describes 45-47 all run connected.
beforeAll(async () => {
  await odm.connect();
});

afterAll(async () => {
  await odm.disconnect();
});

// ─── 41. Result Validators ─────────────────────────────────────────────────

describe('41. Result Validators', () => {
  const {
    generateSubjectResultsSchema,
    generateTermResultsSchema,
    saveGradingScaleSchema,
    listTermResultsSchema,
  } = require('../validators/resultValidators');

  const OID = '64a000000000000000000001';

  test('valid subject generation payload passes', () => {
    const { error } = generateSubjectResultsSchema.validate({
      academicYear: OID, term: OID, class: OID, subject: OID, missingPolicy: 'PENDING',
    });
    expect(error).toBeUndefined();
  });

  test('subject generation without subject fails', () => {
    const { error } = generateSubjectResultsSchema.validate({ academicYear: OID, term: OID, class: OID });
    expect(error).toBeDefined();
  });

  test('unknown missingPolicy fails', () => {
    const { error } = generateSubjectResultsSchema.validate({
      academicYear: OID, term: OID, class: OID, subject: OID, missingPolicy: 'EXCLUDE',
    });
    expect(error).toBeDefined();
  });

  test('term generation payload needs no subject', () => {
    const { error } = generateTermResultsSchema.validate({ academicYear: OID, term: OID, class: OID });
    expect(error).toBeUndefined();
  });

  test('invalid resultType filter fails', () => {
    const { error } = listTermResultsSchema.validate({ resultType: 'WEEKLY' });
    expect(error).toBeDefined();
  });

  test('grading scale requires at least one band', () => {
    const { error } = saveGradingScaleSchema.validate({ academicYear: OID, bands: [] });
    expect(error).toBeDefined();
  });

  test('valid grading scale passes', () => {
    const { error } = saveGradingScaleSchema.validate({
      academicYear: OID, name: 'KIPS',
      bands: [{ grade: 'A', minPercentage: 80, maxPercentage: 100, remark: 'Excellent' }],
    });
    expect(error).toBeUndefined();
  });
});

// ─── 42. Grade Resolution ──────────────────────────────────────────────────

describe('42. Grade resolution (boundaries & gaps)', () => {
  const { resolveGrade, GRADE_SCALE_MAX } = require('../services/markEngine');
  const BANDS = [
    { grade: 'A', minPercentage: 80, maxPercentage: 100, remark: 'Excellent' },
    { grade: 'B', minPercentage: 70, maxPercentage: 80, remark: 'Very Good' },
    { grade: 'C', minPercentage: 60, maxPercentage: 70, remark: 'Good' },
    { grade: 'D', minPercentage: 50, maxPercentage: 60, remark: 'Pass' },
    { grade: 'F', minPercentage: 0, maxPercentage: 50, remark: 'Fail' },
  ];

  test('lower bound is inclusive: 80 → A', () => {
    expect(resolveGrade(80, BANDS).grade).toBe('A');
  });

  test('upper bound is exclusive: 79.99 → B', () => {
    expect(resolveGrade(79.99, BANDS).grade).toBe('B');
  });

  test('100 is inclusive at the top', () => {
    expect(GRADE_SCALE_MAX).toBe(100);
    expect(resolveGrade(100, BANDS).grade).toBe('A');
  });

  test('band boundary 50 → D (lower-inclusive)', () => {
    expect(resolveGrade(50, BANDS).grade).toBe('D');
  });

  test('just below 50 → F; 0 → F', () => {
    expect(resolveGrade(49.999, BANDS).grade).toBe('F');
    expect(resolveGrade(0, BANDS).grade).toBe('F');
  });

  test('gaps resolve to null, never silently filled', () => {
    const gapped = [
      { grade: 'F', minPercentage: 0, maxPercentage: 50 },
      { grade: 'A', minPercentage: 55, maxPercentage: 100 },
    ];
    expect(resolveGrade(52, gapped)).toEqual({ grade: null, remark: null });
    expect(resolveGrade(55, gapped).grade).toBe('A');
    expect(resolveGrade(49.9, gapped).grade).toBe('F');
  });

  test('out-of-range / non-numeric resolve to null', () => {
    expect(resolveGrade(100.01, BANDS).grade).toBeNull();
    expect(resolveGrade(-0.1, BANDS).grade).toBeNull();
    expect(resolveGrade(NaN, BANDS).grade).toBeNull();
    expect(resolveGrade(null, BANDS).grade).toBeNull();
  });

  test('remark is returned from the matching band', () => {
    expect(resolveGrade(65, BANDS).remark).toBe('Good');
  });
});

// ─── 43. Ranking ───────────────────────────────────────────────────────────

describe('43. Ranking (competition, ties, determinism)', () => {
  const { assignRanks, RANK_TIE_POLICIES, DEFAULT_RANK_TIE_POLICY } = require('../services/markEngine');

  const S1 = '64a0000000000000000000a1';
  const S2 = '64a0000000000000000000a2';
  const S3 = '64a0000000000000000000a3';
  const S4 = '64a0000000000000000000a4';

  test('defaults to COMPETITION (1,1,3)', () => {
    expect(DEFAULT_RANK_TIE_POLICY).toBe('COMPETITION');
    expect(RANK_TIE_POLICIES).toContain('DENSE');
    expect(RANK_TIE_POLICIES).toContain('NONE');
  });

  test('competition ranking skips positions after a tie (1,1,3)', () => {
    const ranks = assignRanks([
      { student: S1, average: 90, eligible: true },
      { student: S2, average: 90, eligible: true },
      { student: S3, average: 70, eligible: true },
    ], 'COMPETITION');
    expect(ranks.get(S1)).toBe(1);
    expect(ranks.get(S2)).toBe(1);
    expect(ranks.get(S3)).toBe(3);
  });

  test('dense policy yields 1,1,2', () => {
    const ranks = assignRanks([
      { student: S1, average: 90, eligible: true },
      { student: S2, average: 90, eligible: true },
      { student: S3, average: 70, eligible: true },
    ], 'DENSE');
    expect(ranks.get(S3)).toBe(2);
  });

  test('deterministic: input order never changes ranks', () => {
    const rows = [
      { student: S1, average: 75.5, eligible: true },
      { student: S2, average: 88.25, eligible: true },
      { student: S3, average: 75.5, eligible: true },
      { student: S4, average: 61, eligible: true },
    ];
    const a = assignRanks(rows, 'COMPETITION');
    const b = assignRanks([...rows].reverse(), 'COMPETITION');
    for (const s of [S1, S2, S3, S4]) expect(a.get(s)).toBe(b.get(s));
    expect(a.get(S2)).toBe(1);
    expect(a.get(S1)).toBe(2);
    expect(a.get(S3)).toBe(2);
    expect(a.get(S4)).toBe(4);
  });

  test('unrounded values decide ties — rounded-equal raw-different do NOT tie', () => {
    const ranks = assignRanks([
      { student: S1, average: 78.444, eligible: true },
      { student: S2, average: 78.446, eligible: true },
    ], 'COMPETITION');
    expect(ranks.get(S2)).toBe(1);
    expect(ranks.get(S1)).toBe(2);
  });

  test('ineligible rows are never ranked (null)', () => {
    const ranks = assignRanks([
      { student: S1, average: null, eligible: false },
      { student: S2, average: 80, eligible: true },
      { student: S3, average: 66, eligible: false },
    ], 'COMPETITION');
    expect(ranks.get(S1)).toBeNull();
    expect(ranks.get(S2)).toBe(1);
    expect(ranks.get(S3)).toBeNull();
  });

  test('NONE policy ranks nobody', () => {
    const ranks = assignRanks([{ student: S1, average: 99, eligible: true }], 'NONE');
    expect(ranks.get(S1)).toBeNull();
  });

  test('unknown tie policy falls back to COMPETITION', () => {
    const ranks = assignRanks([
      { student: S1, average: 50, eligible: true },
      { student: S2, average: 40, eligible: true },
    ], 'BOGUS');
    expect(ranks.get(S1)).toBe(1);
    expect(ranks.get(S2)).toBe(2);
  });
});

// ─── 44. Grade bands, aggregation, config hash ─────────────────────────────

describe('44. Grade band validation, aggregation & config hash', () => {
  const { validateGradeBands, aggregateSubjectValues, hashResultConfig } = require('../services/markEngine');

  test('overlapping bands are rejected', () => {
    const out = validateGradeBands([
      { grade: 'A', minPercentage: 75, maxPercentage: 100 },
      { grade: 'B', minPercentage: 70, maxPercentage: 80 },
    ]);
    expect(out.valid).toBe(false);
    expect(out.message).toMatch(/overlap/i);
  });

  test('duplicate grade labels are rejected', () => {
    const out = validateGradeBands([
      { grade: 'A', minPercentage: 80, maxPercentage: 100 },
      { grade: 'a', minPercentage: 0, maxPercentage: 50 },
    ]);
    expect(out.valid).toBe(false);
    expect(out.message).toMatch(/duplicate/i);
  });

  test('min >= max is rejected; out-of-scale rejected', () => {
    expect(validateGradeBands([{ grade: 'A', minPercentage: 80, maxPercentage: 80 }]).valid).toBe(false);
    expect(validateGradeBands([{ grade: 'A', minPercentage: 0, maxPercentage: 120 }]).valid).toBe(false);
  });

  test('gaps between bands are permitted (visible as null grades)', () => {
    const out = validateGradeBands([
      { grade: 'F', minPercentage: 0, maxPercentage: 50 },
      { grade: 'A', minPercentage: 55, maxPercentage: 100 },
    ]);
    expect(out.valid).toBe(true);
  });

  test('valid bands come back sorted by minimum', () => {
    const out = validateGradeBands([
      { grade: 'F', minPercentage: 0, maxPercentage: 50 },
      { grade: 'A', minPercentage: 80, maxPercentage: 100 },
      { grade: 'B', minPercentage: 50, maxPercentage: 80 },
    ]);
    expect(out.valid).toBe(true);
    expect(out.bands.map((b) => b.grade)).toEqual(['F', 'B', 'A']);
  });

  test('PENDING: any null makes the aggregate INCOMPLETE', () => {
    const out = aggregateSubjectValues([80, null, 70], 'PENDING');
    expect(out.average).toBeNull();
    expect(out.status).toBe('INCOMPLETE');
    expect(out.counted).toBe(2);
    expect(out.total).toBe(3);
  });

  test('ZERO policy: nulls dropped from the mean at aggregate level', () => {
    const out = aggregateSubjectValues([80, null, 70], 'ZERO');
    expect(out.average).toBe(75);
    expect(out.status).toBe('COMPLETE');
  });

  test('all nulls → INCOMPLETE under any policy', () => {
    expect(aggregateSubjectValues([null, null], 'ZERO').status).toBe('INCOMPLETE');
    expect(aggregateSubjectValues([], 'PENDING').status).toBe('INCOMPLETE');
  });

  test('config hash: identical inputs → identical hash; weight change → different', () => {
    const a = hashResultConfig({ v: 1, policy: 'PENDING', weights: [50, 50] });
    const b = hashResultConfig({ v: 1, policy: 'PENDING', weights: [50, 50] });
    const c = hashResultConfig({ v: 1, policy: 'PENDING', weights: [60, 40] });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{40}$/);
  });
});

// ─── 45. Integration (real MongoDB) ────────────────────────────────────────

describe('45. Result generation integration', () => {
  const School = require('../models/School');
  const AcademicYear = require('../models/AcademicYear');
  const Term = require('../models/Term');
  const ClassModel = require('../models/Class');
  const Subject = require('../models/Subject');
  const Student = require('../models/Student');
  const Enrollment = require('../models/Enrollment');
  const Assessment = require('../models/Assessment');
  const AssessmentMark = require('../models/AssessmentMark');
  const SubjectResult = require('../models/SubjectResult');
  const TermResult = require('../models/TermResult');
  const ResultSnapshot = require('../models/ResultSnapshot');
  const GradingScale = require('../models/GradingScale');
  const resultService = require('../services/resultService');
  const assessmentMarkService = require('../services/assessmentMarkService');

  let ctx = {};

  const mkMark = async (assessment, student, score, entered = true) =>
    AssessmentMark.create({ school: ctx.school._id, assessment: assessment._id, student, score: entered ? score : null, entered, recordedBy: ctx.userId });

  beforeEach(async () => {
    const models = [School, AcademicYear, Term, ClassModel, Subject, Student, Enrollment, Assessment, AssessmentMark, SubjectResult, TermResult, GradingScale];
    await Promise.all(models.map((m) => m.deleteMany({})));
    // Native driver: the model's append-only hooks also block wipe-all cleanup
    await odm.connection.dropDatabase();

    const userId = new ObjectId();
    const school = await School.create({ name: 'KIPS Phase4', code: 'KIP4', email: 'p4@kips.ac' });
    ctx = { userId, school }; // mkMark reads ctx.school/ctx.userId during seeding
    const year = await AcademicYear.create({ school: school._id, name: '2025-2026', code: 'AY2526', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), status: 'ACTIVE', createdBy: userId });
    const t1 = await Term.create({ school: school._id, academicYear: year._id, name: 'Term 1', code: 'T1', sequence: 1, startDate: new Date('2025-01-01'), endDate: new Date('2025-03-31'), status: 'ACTIVE', createdBy: userId });
    const t2 = await Term.create({ school: school._id, academicYear: year._id, name: 'Term 2', code: 'T2', sequence: 2, startDate: new Date('2025-04-01'), endDate: new Date('2025-07-31'), status: 'ACTIVE', createdBy: userId });
    const t3 = await Term.create({ school: school._id, academicYear: year._id, name: 'Term 3', code: 'T3', sequence: 3, startDate: new Date('2025-08-01'), endDate: new Date('2025-12-31'), status: 'ACTIVE', createdBy: userId });
    const klass = await ClassModel.create({ school: school._id, academicYear: year._id, name: 'Grade 7', code: 'G7', createdBy: userId });
    const math = await Subject.create({ school: school._id, name: 'Mathematics', code: 'MTH', createdBy: userId });
    const science = await Subject.create({ school: school._id, name: 'Science', code: 'SCI', createdBy: userId });

    const mkStudent = (n, first) => Student.create({ school: school._id, admissionNumber: n, firstName: first, lastName: 'Tester', gender: 'OTHER', createdBy: userId });
    const sA = await mkStudent('K001', 'Allan');
    const sB = await mkStudent('K002', 'Bess');
    const sC = await mkStudent('K003', 'Chico');
    for (const st of [sA, sB, sC]) {
      await Enrollment.create({ school: school._id, student: st._id, academicYear: year._id, class: klass._id, enrollmentDate: new Date('2025-01-01'), status: 'ACTIVE', createdBy: userId });
    }

    const mkAssessment = (term, subject, name, maxMarks, weight) =>
      Assessment.create({ school: school._id, academicYear: year._id, term: term._id, class: klass._id, subject: subject._id, type: 'TEST', name, maxMarks, weight, status: 'ACTIVE', createdBy: userId });

    const mathT1a = await mkAssessment(t1, math, 'CAT 1', 40, 50);
    const mathT1b = await mkAssessment(t1, math, 'Exam 1', 60, 50);
    const sciT1 = await mkAssessment(t1, science, 'Test 1', 100, 100);
    await mkMark(mathT1a, sA._id, 32); await mkMark(mathT1a, sB._id, 20); await mkMark(mathT1a, sC._id, 40);
    await mkMark(mathT1b, sA._id, 48); await mkMark(mathT1b, sB._id, 30); await mkMark(mathT1b, sC._id, 60);
    await mkMark(sciT1, sA._id, 90); await mkMark(sciT1, sB._id, 60); await mkMark(sciT1, sC._id, 70);

    const mathT2 = await mkAssessment(t2, math, 'CAT 2', 50, 100);
    const sciT2 = await mkAssessment(t2, science, 'Test 2', 100, 100);
    await mkMark(mathT2, sA._id, 40); await mkMark(mathT2, sB._id, 25); await mkMark(mathT2, sC._id, 50);
    await mkMark(sciT2, sA._id, 80); await mkMark(sciT2, sB._id, 100); await mkMark(sciT2, sC._id, 90);

    Object.assign(ctx, { year, t1, t2, t3, klass, math, science, sA, sB, sC, mathT1a, mathT1b, sciT1 });
  });

  const genSubject = (subject, extra = {}) => resultService.generateSubjectResults({
    school: ctx.school._id, academicYear: ctx.year._id, term: ctx.t1._id,
    class: ctx.klass._id, subject, calculatedBy: ctx.userId, ...extra,
  });

  test('subject generation computes weighted totals, grades and snapshot', async () => {
    const out = await genSubject(ctx.math._id);
    expect(out.success).toBe(true);
    expect(out.summary.students).toBe(3);
    const byStudent = new Map(out.results.map((r) => [r.student.toString(), r]));
    expect(byStudent.get(ctx.sA._id.toString()).total).toBeCloseTo(80, 10);
    expect(byStudent.get(ctx.sB._id.toString()).total).toBeCloseTo(50, 10);
    expect(byStudent.get(ctx.sC._id.toString()).total).toBeCloseTo(100, 10);
    expect(byStudent.get(ctx.sA._id.toString()).grade).toBe('A');
    expect(byStudent.get(ctx.sB._id.toString()).grade).toBe('D');
    expect(byStudent.get(ctx.sA._id.toString()).status).toBe('COMPLETE');
    const snap = await ResultSnapshot.findOne({ school: ctx.school._id, resultType: 'SUBJECT' });
    expect(snap).toBeTruthy();
    expect(snap.payload.rows).toHaveLength(3);
    expect(snap.summary.students).toBe(3);
  });

  test('regeneration upserts — never duplicates (unique current result)', async () => {
    await genSubject(ctx.math._id);
    const out = await genSubject(ctx.math._id);
    expect(out.success).toBe(true);
    const count = await SubjectResult.countDocuments({ subject: ctx.math._id, term: ctx.t1._id });
    expect(count).toBe(3);
  });

  test('weight totals above 100 are rejected — never silently normalised', async () => {
    await Assessment.create({ school: ctx.school._id, academicYear: ctx.year._id, term: ctx.t1._id, class: ctx.klass._id, subject: ctx.science._id, type: 'TEST', name: 'Over', maxMarks: 10, weight: 60, status: 'ACTIVE', createdBy: ctx.userId });
    await expect(genSubject(ctx.science._id)).rejects.toThrow(/weight/i);
  });

  test('PENDING policy: missing mark → INCOMPLETE, total null', async () => {
    await AssessmentMark.deleteOne({ assessment: ctx.mathT1b._id, student: ctx.sB._id });
    const out = await genSubject(ctx.math._id, { missingPolicy: 'PENDING' });
    const b = out.results.find((r) => r.student.toString() === ctx.sB._id.toString());
    expect(b.status).toBe('INCOMPLETE');
    expect(b.total).toBeNull();
    const a = out.results.find((r) => r.student.toString() === ctx.sA._id.toString());
    expect(a.status).toBe('COMPLETE');
    expect(a.total).toBeCloseTo(80, 10);
  });

  test('ZERO policy: missing mark scored 0 — total still COMPLETE', async () => {
    await AssessmentMark.deleteOne({ assessment: ctx.mathT1b._id, student: ctx.sB._id });
    const out = await genSubject(ctx.math._id, { missingPolicy: 'ZERO' });
    const b = out.results.find((r) => r.student.toString() === ctx.sB._id.toString());
    expect(b.status).toBe('COMPLETE');
    expect(b.total).toBeCloseTo(25, 10); // (20/40)*50 = 25
    expect(b.missingCount).toBe(1);
  });

  test('cross-school year is rejected (400)', async () => {
    const other = await AcademicYear.create({ school: new ObjectId(), name: 'Other', code: 'OTH', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), createdBy: ctx.userId });
    await expect(genSubject(ctx.math._id, { academicYear: other._id })).rejects.toThrow(/academic year/i);
  });
});

// ─── 46. Term windows & ranking ────────────────────────────────────────────

describe('46. Term/cumulative/annual windows & ranking', () => {
  const School = require('../models/School');
  const AcademicYear = require('../models/AcademicYear');
  const Term = require('../models/Term');
  const ClassModel = require('../models/Class');
  const Subject = require('../models/Subject');
  const Student = require('../models/Student');
  const Enrollment = require('../models/Enrollment');
  const Assessment = require('../models/Assessment');
  const AssessmentMark = require('../models/AssessmentMark');
  const TermResult = require('../models/TermResult');
  const ResultSnapshot = require('../models/ResultSnapshot');
  const resultService = require('../services/resultService');

  let c = {};

  const seedTerms = async () => {
    await Promise.all([School, AcademicYear, Term, ClassModel, Subject, Student, Enrollment, Assessment, AssessmentMark, TermResult]
      .map((m) => m.deleteMany({})));
    await odm.connection.dropDatabase();
    const userId = new ObjectId();
    const school = await School.create({ name: 'KIPS P4T', code: 'KIP4T', email: 'p4t@kips.ac' });
    const year = await AcademicYear.create({ school: school._id, name: '2025-2026', code: 'AY2526', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), status: 'ACTIVE', createdBy: userId });
    const mkTerm = (code, sequence) => Term.create({ school: school._id, academicYear: year._id, name: `Term ${sequence}`, code, sequence, startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), status: 'ACTIVE', createdBy: userId });
    const t1 = await mkTerm('T1', 1);
    const t2 = await mkTerm('T2', 2);
    const t3 = await mkTerm('T3', 3);
    const klass = await ClassModel.create({ school: school._id, academicYear: year._id, name: 'Grade 8', code: 'G8', createdBy: userId });
    const math = await Subject.create({ school: school._id, name: 'Mathematics', code: 'MTH', createdBy: userId });
    const science = await Subject.create({ school: school._id, name: 'Science', code: 'SCI', createdBy: userId });
    const mkStudent = (n) => Student.create({ school: school._id, admissionNumber: n, firstName: n, lastName: 'T', gender: 'OTHER', createdBy: userId });
    const sA = await mkStudent('S001');
    const sB = await mkStudent('S002');
    const sC = await mkStudent('S003');
    for (const st of [sA, sB, sC]) {
      await Enrollment.create({ school: school._id, student: st._id, academicYear: year._id, class: klass._id, enrollmentDate: new Date('2025-01-01'), status: 'ACTIVE', createdBy: userId });
    }
    const mkAs = async (term, subject, name, max, weight, scores) => {
      const a = await Assessment.create({ school: school._id, academicYear: year._id, term: term._id, class: klass._id, subject: subject._id, type: 'TEST', name, maxMarks: max, weight, status: 'ACTIVE', createdBy: userId });
      await Promise.all([sA, sB, sC].map((st, i) =>
        AssessmentMark.create({ school: school._id, assessment: a._id, student: st._id, score: scores[i], entered: true, recordedBy: userId })));
      return a;
    };
    // t1: Math 80/50/100, Science 90/60/70 — t2: Math 80/50/100, Science 80/100/90
    await mkAs(t1, math, 'M1', 100, 100, [80, 50, 100]);
    await mkAs(t1, science, 'S1', 100, 100, [90, 60, 70]);
    await mkAs(t2, math, 'M2', 100, 100, [80, 50, 100]);
    await mkAs(t2, science, 'S2', 100, 100, [80, 100, 90]);
    c = { userId, school, year, t1, t2, t3, klass, math, science, sA, sB, sC };
  };

  const genTerm = (term, extra = {}) => resultService.generateTermResults({
    school: c.school._id, academicYear: c.year._id, term, class: c.klass._id,
    calculatedBy: c.userId, ...extra,
  });

  beforeEach(seedTerms);

  test('sequence 1 → TERM window (this term only)', async () => {
    const out = await genTerm(c.t1._id);
    expect(out.success).toBe(true);
    expect(out.resultType).toBe('TERM');
    const a = await TermResult.findOne({ student: c.sA._id, term: c.t1._id, resultType: 'TERM' });
    expect(a.termsIncluded.map((t) => t.toString())).toEqual([c.t1._id.toString()]);
    expect(a.average).toBeCloseTo(85, 10); // (80+90)/2
    expect(a.rankOutOf).toBe(3);
  });

  test('middle sequence → CUMULATIVE (terms 1..N)', async () => {
    await genTerm(c.t1._id);
    const out = await genTerm(c.t2._id);
    expect(out.resultType).toBe('CUMULATIVE');
    const a = await TermResult.findOne({ student: c.sA._id, term: c.t2._id, resultType: 'CUMULATIVE' });
    expect(a.termsIncluded.map((t) => t.toString())).toEqual([c.t1._id.toString(), c.t2._id.toString()]);
    expect(a.average).toBeCloseTo(82.5, 10); // ((80+90)/2 + (80+80)/2)/2
    const b = await TermResult.findOne({ student: c.sB._id, term: c.t2._id, resultType: 'CUMULATIVE' });
    expect(b.average).toBeCloseTo(65, 10); // ((50+60)/2 + (50+100)/2)/2
  });

  test('last sequence → ANNUAL (all terms); terms without data skipped', async () => {
    await genTerm(c.t1._id);
    await genTerm(c.t2._id);
    const out = await genTerm(c.t3._id);
    expect(out.resultType).toBe('ANNUAL');
    const a = await TermResult.findOne({ student: c.sA._id, term: c.t3._id, resultType: 'ANNUAL' });
    expect(a.termsIncluded.map((t) => t.toString()))
      .toEqual([c.t1._id.toString(), c.t2._id.toString(), c.t3._id.toString()]);
    expect(a.average).toBeCloseTo(82.5, 10); // Math(80,80)→80, Science(90,80)→85 → (80+85)/2
    expect(a.status).toBe('COMPLETE');
  });

  test('competition ranking: A & C tie at 85 → both rank 1, B rank 3', async () => {
    const out = await genTerm(c.t1._id);
    const rows = out.results;
    const byStudent = new Map(rows.map((r) => [r.student.toString(), r]));
    expect(byStudent.get(c.sA._id.toString()).rank).toBe(1);
    expect(byStudent.get(c.sC._id.toString()).rank).toBe(1);
    expect(byStudent.get(c.sB._id.toString()).rank).toBe(3);
    expect(byStudent.get(c.sB._id.toString()).rankOutOf).toBe(3);
  });

  test('ranking is deterministic across regeneration (no random reshuffling)', async () => {
    const first = await genTerm(c.t1._id);
    const map1 = new Map(first.results.map((r) => [r.student.toString(), r.rank]));
    const second = await genTerm(c.t1._id);
    const map2 = new Map(second.results.map((r) => [r.student.toString(), r.rank]));
    for (const [s, rank] of map1) expect(map2.get(s)).toBe(rank);
  });

  test('single-term year → TERM with INCOMPLETE rows when no assessments exist', async () => {
    const userId = new ObjectId();
    const year = await AcademicYear.create({ school: c.school._id, name: 'Solo', code: 'SOLO', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), status: 'ACTIVE', createdBy: userId });
    const t = await Term.create({ school: c.school._id, academicYear: year._id, name: 'Only', code: 'ON', sequence: 1, startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), status: 'ACTIVE', createdBy: userId });
    const klass = await ClassModel.create({ school: c.school._id, academicYear: year._id, name: 'Solo Class', code: 'SC', createdBy: userId });
    const st = await Student.create({ school: c.school._id, admissionNumber: 'S999', firstName: 'Solo', lastName: 'T', gender: 'OTHER', createdBy: userId });
    await Enrollment.create({ school: c.school._id, student: st._id, academicYear: year._id, class: klass._id, enrollmentDate: new Date('2025-01-01'), status: 'ACTIVE', createdBy: userId });
    const out = await resultService.generateTermResults({ school: c.school._id, academicYear: year._id, term: t._id, class: klass._id, calculatedBy: userId });
    expect(out.resultType).toBe('TERM');
    const row = await TermResult.findOne({ student: st._id, term: t._id, resultType: 'TERM' });
    expect(row).toBeTruthy();
    expect(row.average).toBeNull(); // no assessments → INCOMPLETE, never silently 0
    expect(row.status).toBe('INCOMPLETE');
  });

  test('generation writes an immutable TERM snapshot', async () => {
    await genTerm(c.t1._id);
    const snap = await ResultSnapshot.findOne({ school: c.school._id, resultType: 'TERM' });
    expect(snap).toBeTruthy();
    expect(snap.payload.rows).toHaveLength(3);
    expect(snap.summary.ranked).toBe(3);
    expect(String(snap.configHash)).toMatch(/^[0-9a-f]{40}$/);
  });
});

// ─── 47. Invalidation, immutability & grading scales ──────────────────────

describe('47. Stale invalidation, snapshot immutability & grading scales', () => {
  const School = require('../models/School');
  const AcademicYear = require('../models/AcademicYear');
  const Term = require('../models/Term');
  const ClassModel = require('../models/Class');
  const Subject = require('../models/Subject');
  const Student = require('../models/Student');
  const Enrollment = require('../models/Enrollment');
  const Assessment = require('../models/Assessment');
  const AssessmentMark = require('../models/AssessmentMark');
  const SubjectResult = require('../models/SubjectResult');
  const TermResult = require('../models/TermResult');
  const ResultSnapshot = require('../models/ResultSnapshot');
  const GradingScale = require('../models/GradingScale');
  const resultService = require('../services/resultService');
  const assessmentMarkService = require('../services/assessmentMarkService');

  let c = {};

  beforeEach(async () => {
    await Promise.all([School, AcademicYear, Term, ClassModel, Subject, Student, Enrollment, Assessment, AssessmentMark, SubjectResult, TermResult, GradingScale]
      .map((m) => m.deleteMany({})));
    // Native driver: the model's append-only hooks also block wipe-all cleanup
    await odm.connection.dropDatabase();
    const userId = new ObjectId();
    const school = await School.create({ name: 'KIPS P4S', code: 'KIP4S', email: 'p4s@kips.ac' });
    const year = await AcademicYear.create({ school: school._id, name: '2025-2026', code: 'AY2526', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), status: 'ACTIVE', createdBy: userId });
    const term = await Term.create({ school: school._id, academicYear: year._id, name: 'Term 1', code: 'T1', sequence: 1, startDate: new Date('2025-01-01'), endDate: new Date('2025-03-31'), status: 'ACTIVE', createdBy: userId });
    const klass = await ClassModel.create({ school: school._id, academicYear: year._id, name: 'Grade 6', code: 'G6', createdBy: userId });
    const subject = await Subject.create({ school: school._id, name: 'Mathematics', code: 'MTH', createdBy: userId });
    const sA = await Student.create({ school: school._id, admissionNumber: 'X001', firstName: 'Ana', lastName: 'T', gender: 'OTHER', createdBy: userId });
    const sB = await Student.create({ school: school._id, admissionNumber: 'X002', firstName: 'Ben', lastName: 'T', gender: 'OTHER', createdBy: userId });
    for (const st of [sA, sB]) {
      await Enrollment.create({ school: school._id, student: st._id, academicYear: year._id, class: klass._id, enrollmentDate: new Date('2025-01-01'), status: 'ACTIVE', createdBy: userId });
    }
    const as = await Assessment.create({ school: school._id, academicYear: year._id, term: term._id, class: klass._id, subject: subject._id, type: 'TEST', name: 'Main', maxMarks: 100, weight: 100, status: 'ACTIVE', createdBy: userId });
    await AssessmentMark.create({ school: school._id, assessment: as._id, student: sA._id, score: 90, entered: true, recordedBy: userId });
    await AssessmentMark.create({ school: school._id, assessment: as._id, student: sB._id, score: 40, entered: true, recordedBy: userId });
    c = { userId, school, year, term, klass, subject, sA, sB, as };
  });

  const genAll = async () => {
    await resultService.generateSubjectResults({ school: c.school._id, academicYear: c.year._id, term: c.term._id, class: c.klass._id, subject: c.subject._id, calculatedBy: c.userId });
    await resultService.generateTermResults({ school: c.school._id, academicYear: c.year._id, term: c.term._id, class: c.klass._id, calculatedBy: c.userId });
  };

  test('mark change flags SubjectResult AND TermResult stale (scope-wide)', async () => {
    await genAll();
    expect(await SubjectResult.find({ isStale: true })).toHaveLength(0);
    await assessmentMarkService.recordMark({
      school: c.school._id, assessmentId: c.as._id, studentId: c.sA._id,
      score: 95, entered: true, recordedBy: c.userId, reason: 'corrected',
    });
    // Invalidation is conservative: the whole subject scope is flagged
    expect(await SubjectResult.countDocuments({ isStale: true })).toBe(2);
    expect(await TermResult.countDocuments({ isStale: true })).toBe(2);
  });

  test('recalculation recomputes and clears the stale flag', async () => {
    await resultService.generateSubjectResults({ school: c.school._id, academicYear: c.year._id, term: c.term._id, class: c.klass._id, subject: c.subject._id, calculatedBy: c.userId });
    await assessmentMarkService.recordMark({
      school: c.school._id, assessmentId: c.as._id, studentId: c.sA._id,
      score: 95, entered: true, recordedBy: c.userId, reason: 'corrected',
    });
    expect(await SubjectResult.countDocuments({ isStale: true })).toBe(2);
    const out = await resultService.recalculateScope({
      school: c.school._id, academicYear: c.year._id, term: c.term._id,
      class: c.klass._id, subject: c.subject._id, calculatedBy: c.userId,
    });
    expect(out.success).toBe(true);
    const row = await SubjectResult.findOne({ student: c.sA._id, subject: c.subject._id });
    expect(row.isStale).toBe(false);
    expect(row.total).toBeCloseTo(95, 10);
  });

  test('ResultSnapshot rejects update and delete (append-only)', async () => {
    await resultService.generateSubjectResults({ school: c.school._id, academicYear: c.year._id, term: c.term._id, class: c.klass._id, subject: c.subject._id, calculatedBy: c.userId });
    expect(await ResultSnapshot.countDocuments({})).toBe(1);
    await expect(ResultSnapshot.updateOne({}, { $set: { reason: 'MANUAL' } })).rejects.toThrow(/immutable/i);
    await expect(ResultSnapshot.deleteMany({})).rejects.toThrow(/immutable/i);
    await expect(ResultSnapshot.findOneAndUpdate({}, { reason: 'MANUAL' })).rejects.toThrow(/immutable/i);
    expect(await ResultSnapshot.countDocuments({})).toBe(1);
  });

  test('saving a grading scale persists bands and flags year results stale', async () => {
    await resultService.generateSubjectResults({ school: c.school._id, academicYear: c.year._id, term: c.term._id, class: c.klass._id, subject: c.subject._id, calculatedBy: c.userId });
    const scale = await resultService.saveGradingScale({
      school: c.school._id, academicYear: c.year._id, name: 'KIPS Custom',
      bands: [
        { grade: 'A', minPercentage: 85, maxPercentage: 100, remark: 'Dist' },
        { grade: 'F', minPercentage: 0, maxPercentage: 40, remark: 'Fail' },
      ],
      createdBy: c.userId,
    });
    expect(scale.status).toBe('ACTIVE');
    expect(scale.bands).toHaveLength(2);
    expect(await SubjectResult.countDocuments({ isStale: true })).toBe(2);
    const active = await resultService.getGradingScale(c.school._id, c.year._id);
    expect(active.name).toBe('KIPS Custom');
  });

  test('overlapping bands rejected with 400', async () => {
    await expect(resultService.saveGradingScale({
      school: c.school._id, academicYear: c.year._id, name: 'Bad',
      bands: [
        { grade: 'A', minPercentage: 75, maxPercentage: 100 },
        { grade: 'B', minPercentage: 70, maxPercentage: 80 },
      ],
      createdBy: c.userId,
    })).rejects.toThrow(/overlap/i);
  });

  test('resultStatus reports stale counts after a mark change', async () => {
    await resultService.generateSubjectResults({ school: c.school._id, academicYear: c.year._id, term: c.term._id, class: c.klass._id, subject: c.subject._id, calculatedBy: c.userId });
    await assessmentMarkService.recordMark({
      school: c.school._id, assessmentId: c.as._id, studentId: c.sB._id,
      score: 41, entered: true, recordedBy: c.userId,
    });
    const status = await resultService.resultStatus(c.school._id, { academicYear: c.year._id });
    expect(status.stale.subjects).toBe(2); // scope-wide invalidation
    const total = status.subjects.reduce((sum, g) => sum + g.count, 0);
    expect(total).toBe(2);
  });
});

// ─── 48. HTTP routes: permissions, CSRF, meta ──────────────────────────────

describe('48. Result routes (permissions, CSRF, meta)', () => {
  const resultService = require('../services/resultService');
  const assessmentService = require('../services/assessmentService');
  const OID = '64a000000000000000000001';
  const genBody = { academicYear: OID, term: OID, class: OID, subject: OID };

  test('GET /api/results/meta returns engine constants', async () => {
    const app = buildApp();
    const res = await authGet(app, '/api/results/meta', 'ADMIN');
    expect(res.status).toBe(200);
    expect(res.body.rankTiePolicies).toContain('COMPETITION');
    expect(res.body.resultTypes).toEqual(['TERM', 'CUMULATIVE', 'ANNUAL']);
    expect(Array.isArray(res.body.defaultBands)).toBe(true);
    expect(res.body.calculationVersion).toBe(1);
  });

  test('TEACHER cannot generate subject results (403)', async () => {
    const app = buildApp();
    const res = await authPost(app, '/api/results/subject/generate', genBody, 'TEACHER');
    expect(res.status).toBe(403);
  });

  test('CLASS_TEACHER cannot generate term results (403)', async () => {
    const app = buildApp();
    const res = await authPost(app, '/api/results/term/generate', { academicYear: OID, term: OID, class: OID }, 'CLASS_TEACHER');
    expect(res.status).toBe(403);
  });

  test('DOS generation succeeds, is audited, returns 200', async () => {
    jest.spyOn(resultService, 'generateSubjectResults').mockResolvedValue({
      success: true, results: [], failures: [], resultType: 'SUBJECT',
      summary: { students: 0, succeeded: 0, failed: 0, complete: 0, incomplete: 0, ranked: 0 },
    });
    const app = buildApp();
    const res = await authPost(app, '/api/results/subject/generate', genBody, 'DOS');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(resultService.generateSubjectResults).toHaveBeenCalledTimes(1);
    const actions = AuditLog.create.mock.calls.map((c) => c[0].action);
    expect(actions).toContain('RESULTS_GENERATED');
  });

  test('partial failure returns 207 with failures reported', async () => {
    jest.spyOn(resultService, 'generateTermResults').mockResolvedValue({
      success: false, results: [], resultType: 'TERM',
      failures: [{ student: 'x', error: 'boom' }],
      summary: { students: 1, succeeded: 0, failed: 1, complete: 0, incomplete: 0, ranked: 0 },
    });
    const app = buildApp();
    const res = await authPost(app, '/api/results/term/generate', { academicYear: OID, term: OID, class: OID }, 'ADMIN');
    expect(res.status).toBe(207);
    expect(res.body.failures).toHaveLength(1);
  });

  test('generation without CSRF token is rejected (403)', async () => {
    jest.spyOn(resultService, 'generateSubjectResults').mockResolvedValue({
      success: true, results: [], failures: [], resultType: 'SUBJECT', summary: {},
    });
    const app = buildApp();
    authService.getUserFromPayload.mockResolvedValue(makeUser({ role: 'ADMIN' }));
    const token = issueToken('ADMIN');
    const res = await request(app)
      .post('/api/results/subject/generate')
      .set('Cookie', makeAuthCookie(token))
      .send(genBody);
    expect(res.status).toBe(403);
    expect(resultService.generateSubjectResults).not.toHaveBeenCalled();
  });

  test('ADMIN lists subject results; teacher with empty scope sees none', async () => {
    const row = {
      _id: OID, academicYear: { _id: OID }, term: { _id: OID }, class: { _id: OID },
      subject: { _id: '64a000000000000000000002' }, student: { _id: '64a000000000000000000003' },
      total: 85, grade: 'A', status: 'COMPLETE', rank: 1,
    };
    jest.spyOn(resultService, 'listSubjectResults').mockResolvedValue([row]);
    const app = buildApp();

    const adminRes = await authGet(app, '/api/results/subject', 'ADMIN');
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.results).toHaveLength(1);

    jest.spyOn(assessmentService, 'getTeacherScope').mockResolvedValue({ teaching: [], classTeaching: [] });
    const teacherRes = await authGet(app, '/api/results/subject', 'TEACHER');
    expect(teacherRes.status).toBe(200);
    expect(teacherRes.body.results).toHaveLength(0);
  });

  test('teacher sees subject results only within assignment tuple', async () => {
    const row = {
      _id: OID, academicYear: { _id: OID }, term: { _id: OID }, class: { _id: OID },
      subject: { _id: '64a000000000000000000002' }, student: { _id: '64a000000000000000000003' },
      total: 85, grade: 'A', status: 'COMPLETE', rank: 1,
    };
    jest.spyOn(resultService, 'listSubjectResults').mockResolvedValue([row]);
    jest.spyOn(assessmentService, 'getTeacherScope').mockResolvedValue({
      teaching: [{ academicYear: OID, term: OID, class: OID, subject: '64a000000000000000000002' }],
      classTeaching: [],
    });
    const app = buildApp();
    const res = await authGet(app, '/api/results/subject', 'TEACHER');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
  });

  test('TEACHER cannot save grading scale (403); ADMIN can (201)', async () => {
    const app = buildApp();
    const deny = await authPost(app, '/api/results/grading-scale', {
      academicYear: OID, bands: [{ grade: 'A', minPercentage: 80, maxPercentage: 100 }],
    }, 'TEACHER');
    expect(deny.status).toBe(403);

    jest.spyOn(resultService, 'saveGradingScale').mockResolvedValue({
      _id: '64a000000000000000000009', name: 'Scale', status: 'ACTIVE',
      bands: [{ grade: 'A', minPercentage: 80, maxPercentage: 100 }],
    });
    const ok = await authPost(app, '/api/results/grading-scale', {
      academicYear: OID, bands: [{ grade: 'A', minPercentage: 80, maxPercentage: 100 }],
    }, 'ADMIN');
    expect(ok.status).toBe(201);
    expect(AuditLog.create).toHaveBeenCalled();
  });

  test('unauthenticated requests are rejected', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/results/meta');
    expect(res.status).toBe(401);
  });

  test('validation failure on generate returns 400', async () => {
    const app = buildApp();
    const res = await authPost(app, '/api/results/subject/generate', { academicYear: OID }, 'ADMIN');
    expect(res.status).toBe(400);
  });
});











