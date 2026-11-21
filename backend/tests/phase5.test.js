'use strict';

/**
 * KIPS-SMS Phase 5 — Report Cards, PDF/Print, Review, Approval & Publication
 *
 * Covers: report validators, period windows (T1 TERM / T1+T2 CUMULATIVE /
 *         T1+T2+T3 ANNUAL) as frozen in report payloads, authoritative-source
 *         consistency (payload copies TermResult verbatim — the screen and PDF
 *         render this same payload), lifecycle transitions (valid + invalid),
 *         version preservation across regeneration, stale rejection and
 *         publication after correction, audit actions, and HTTP authorization /
 *         IDOR / school scoping for ADMIN, DOS, CLASS_TEACHER and TEACHER.
 *
 * Integration sections run against a real standalone PostgreSQL
 * (kips_sms_test_p5); HTTP sections use the same real database so scope
 * filters and IDOR checks exercise real documents.
 */

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/kips_sms_test_p5';
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

// ─── HTTP helpers (same shape as phases 2-4) ────────────────────────────────

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

const MONGO = 'postgresql://postgres:postgres@localhost:5432/kips_sms_test_p5';

beforeAll(async () => {
  await odm.connect();
});

afterAll(async () => {
  await odm.disconnect();
});

// ─── Shared seed: a real school with 3 terms, 3 students and marks ──────────
// Expected values (weighted totals, engine rules from phase 4):
//   Term 1:  A: Math 80, Science 90 → avg 85 (rank 1, tie with C)
//            B: Math 50, Science 60 → avg 55 (rank 3)
//            C: Math 100, Science 70 → avg 85 (rank 1)
//   Term 2:  A: Math 80, Science 80 → avg 80; B: 50/100 → 75; C: 100/90 → 95
//   Cumulative T1+T2: A 82.5, B 65, C 90
//   Term 3 has no assessments → annual window includes T3 but skips it.

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
const ReportCard = require('../models/ReportCard');
const ReportVersion = require('../models/ReportVersion');
const TeacherAssignment = require('../models/TeacherAssignment');
const ClassTeacherAssignment = require('../models/ClassTeacherAssignment');
const MarkCorrection = require('../models/MarkCorrection');

const resultService = require('../services/resultService');
const reportService = require('../services/reportService');
const assessmentMarkService = require('../services/assessmentMarkService');

const SEED_MODELS = [
  School, AcademicYear, Term, ClassModel, Subject, Student, Enrollment, Assessment,
  AssessmentMark, SubjectResult, TermResult, GradingScale, ReportCard,
  TeacherAssignment, ClassTeacherAssignment,
];

const wipeAll = async () => {
  await Promise.all(SEED_MODELS.map((m) => m.deleteMany({})));
  // Append-only immutability hooks block the model API — wipe raw collections.
  await odm.connection.dropDatabase();
};

const seedSchool = async (opts = {}) => {
  await wipeAll();
  const userId = new ObjectId();
  const school = await School.create({
    ...(opts.schoolId ? { _id: opts.schoolId } : {}),
    name: 'KIPS Phase5', code: 'KIP5', email: 'p5@kips.ac',
  });
  const year = await AcademicYear.create({
    school: school._id, name: '2025-2026', code: 'AY2526',
    startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'),
    status: 'ACTIVE', createdBy: userId,
  });
  const mkTerm = (name, code, sequence) => Term.create({
    school: school._id, academicYear: year._id, name, code, sequence,
    startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'),
    status: 'ACTIVE', createdBy: userId,
  });
  const t1 = await mkTerm('Term 1', 'T1', 1);
  const t2 = await mkTerm('Term 2', 'T2', 2);
  const t3 = await mkTerm('Term 3', 'T3', 3);
  const klass = await ClassModel.create({ school: school._id, academicYear: year._id, name: 'Grade 7', code: 'G7', createdBy: userId });
  const math = await Subject.create({ school: school._id, name: 'Mathematics', code: 'MTH', createdBy: userId });
  const science = await Subject.create({ school: school._id, name: 'Science', code: 'SCI', createdBy: userId });

  const mkStudent = (n, first) => Student.create({ school: school._id, admissionNumber: n, firstName: first, lastName: 'Tester', gender: 'OTHER', createdBy: userId });
  const sA = await mkStudent('P5001', 'Allan');
  const sB = await mkStudent('P5002', 'Bess');
  const sC = await mkStudent('P5003', 'Chico');
  for (const st of [sA, sB, sC]) {
    await Enrollment.create({
      school: school._id, student: st._id, academicYear: year._id, class: klass._id,
      enrollmentDate: new Date('2025-01-01'), status: 'ACTIVE', createdBy: userId,
    });
  }

  const mkAssessment = (term, subject, name, maxMarks, weight) =>
    Assessment.create({
      school: school._id, academicYear: year._id, term: term._id, class: klass._id,
      subject: subject._id, type: 'TEST', name, maxMarks, weight, status: 'ACTIVE', createdBy: userId,
    });
  const mkMark = (assessment, student, score) =>
    AssessmentMark.create({ school: school._id, assessment: assessment._id, student: student._id, score, entered: true, recordedBy: userId });

  const mathT1a = await mkAssessment(t1, math, 'CAT 1', 40, 50);
  const mathT1b = await mkAssessment(t1, math, 'Exam 1', 60, 50);
  const sciT1 = await mkAssessment(t1, science, 'Test 1', 100, 100);
  await mkMark(mathT1a, sA, 32); await mkMark(mathT1a, sB, 20); await mkMark(mathT1a, sC, 40);
  await mkMark(mathT1b, sA, 48); await mkMark(mathT1b, sB, 30); await mkMark(mathT1b, sC, 60);
  await mkMark(sciT1, sA, 90); await mkMark(sciT1, sB, 60); await mkMark(sciT1, sC, 70);

  const mathT2 = await mkAssessment(t2, math, 'CAT 2', 50, 100);
  const sciT2 = await mkAssessment(t2, science, 'Test 2', 100, 100);
  await mkMark(mathT2, sA, 40); await mkMark(mathT2, sB, 25); await mkMark(mathT2, sC, 50);
  await mkMark(sciT2, sA, 80); await mkMark(sciT2, sB, 100); await mkMark(sciT2, sC, 90);

  return { userId, school, year, t1, t2, t3, klass, math, science, sA, sB, sC, mathT1a, mathT1b, sciT1, mathT2, sciT2 };
};

const genTerm = (c, term) => resultService.generateTermResults({
  school: c.school._id, academicYear: c.year._id, term, class: c.klass._id, calculatedBy: c.userId,
});

const genReports = (c, term) => reportService.generateReports({
  school: c.school._id, academicYear: c.year._id, term, class: c.klass._id, generatedBy: c.userId,
});

const transition = (cardId, action, schoolId, extra = {}) =>
  reportService.transition({ reportId: cardId, action, actor: new ObjectId(), school: schoolId, ...extra });

describe('51. Report validators', () => {
  const {
    generateReportsSchema, reportIdParamSchema, reportVersionParamSchema,
    reportTransitionSchema, reportInvalidateSchema, listReportsSchema,
  } = require('../validators/reportValidators');

  const OID = '64a000000000000000000001';

  test('valid generation payload passes', () => {
    const { error } = generateReportsSchema.validate({ academicYear: OID, term: OID, class: OID });
    expect(error).toBeUndefined();
  });

  test('generation payload without term fails', () => {
    const { error } = generateReportsSchema.validate({ academicYear: OID, class: OID });
    expect(error).toBeDefined();
  });

  test('non-objectId id fails', () => {
    expect(reportIdParamSchema.validate({ id: 'not-an-id' }).error).toBeDefined();
    expect(reportIdParamSchema.validate({ id: OID }).error).toBeUndefined();
  });

  test('version param must be an integer >= 1', () => {
    expect(reportVersionParamSchema.validate({ id: OID, version: 0 }).error).toBeDefined();
    expect(reportVersionParamSchema.validate({ id: OID, version: 'abc' }).error).toBeDefined();
    expect(reportVersionParamSchema.validate({ id: OID, version: 2 }).error).toBeUndefined();
  });

  test('transition note is optional but capped at 500 chars', () => {
    expect(reportTransitionSchema.validate({}).error).toBeUndefined();
    expect(reportTransitionSchema.validate({ note: 'ok' }).error).toBeUndefined();
    expect(reportTransitionSchema.validate({ note: 'x'.repeat(501) }).error).toBeDefined();
  });

  test('invalidate reason is optional but capped', () => {
    expect(reportInvalidateSchema.validate({}).error).toBeUndefined();
    expect(reportInvalidateSchema.validate({ reason: 'x'.repeat(501) }).error).toBeDefined();
  });

  test('list filter rejects unknown status and stale values', () => {
    expect(listReportsSchema.validate({ status: 'DRAFT' }).error).toBeDefined();
    expect(listReportsSchema.validate({ status: 'PUBLISHED' }).error).toBeUndefined();
    expect(listReportsSchema.validate({ stale: 'yes' }).error).toBeDefined();
    expect(listReportsSchema.validate({ stale: 'true' }).error).toBeUndefined();
  });
});

describe('52. Report period windows and authoritative source', () => {
  let c = {};
  beforeEach(async () => { c = await seedSchool(); });

  test('Term 1 report freezes the TERM window (T1 only)', async () => {
    await genTerm(c, c.t1._id);
    const out = await genReports(c, c.t1._id);
    expect(out.success).toBe(true);
    expect(out.resultType).toBe('TERM');
    expect(out.summary.students).toBe(3);
    for (const { version } of out.results) {
      expect(version.payload.resultType).toBe('TERM');
      expect(version.payload.termsIncluded.map((t) => t.sequence)).toEqual([1]);
    }
  });

  test('Term 2 report freezes the CUMULATIVE window (T1+T2)', async () => {
    await genTerm(c, c.t1._id);
    await genTerm(c, c.t2._id);
    const out = await genReports(c, c.t2._id);
    expect(out.success).toBe(true);
    expect(out.resultType).toBe('CUMULATIVE');
    for (const { version } of out.results) {
      expect(version.payload.termsIncluded.map((t) => t.sequence)).toEqual([1, 2]);
    }
    const a = out.results.find((r) => r.version.payload.student.admissionNumber === 'P5001');
    expect(a.version.payload.average).toBeCloseTo(82.5, 10);
  });

  test('Term 3 report freezes the ANNUAL window (T1+T2+T3), skipping terms with no data', async () => {
    await genTerm(c, c.t1._id);
    await genTerm(c, c.t2._id);
    await genTerm(c, c.t3._id);
    const out = await genReports(c, c.t3._id);
    expect(out.success).toBe(true);
    expect(out.resultType).toBe('ANNUAL');
    for (const { version } of out.results) {
      expect(version.payload.termsIncluded.map((t) => t.sequence)).toEqual([1, 2, 3]);
    }
    const a = out.results.find((r) => r.version.payload.student.admissionNumber === 'P5001');
    // T3 has no assessments → annual average equals the T1+T2 values.
    expect(a.version.payload.average).toBeCloseTo(82.5, 10);
  });

  test('payload copies TermResult verbatim — no independent recomputation', async () => {
    await genTerm(c, c.t2._id);
    const out = await genReports(c, c.t2._id);
    for (const { card, version } of out.results) {
      const tr = await TermResult.findById(card.sourceTermResult).lean();
      expect(tr).toBeTruthy();
      expect(version.payload.average).toBe(tr.average); // exact — not re-derived
      expect(version.payload.grade).toBe(tr.grade);
      expect(version.payload.rank).toBe(tr.rank);
      expect(version.payload.rankOutOf).toBe(tr.rankOutOf);
      expect(version.payload.status).toBe(tr.status);
      expect(version.payload.configHash).toBe(tr.configHash);
      expect(version.payload.subjects.map((s) => s.value))
        .toEqual(tr.subjects.map((s) => s.value));
      expect(version.payload.subjects.map((s) => s.grade))
        .toEqual(tr.subjects.map((s) => s.grade));
    }
  });

  test('payload carries identity, class, year, term, bands and completeness', async () => {
    await genTerm(c, c.t1._id);
    const out = await genReports(c, c.t1._id);
    const { version } = out.results.find((r) => r.version.payload.student.admissionNumber === 'P5002');
    const p = version.payload;
    expect(p.student.firstName).toBe('Bess');
    expect(p.student.lastName).toBe('Tester');
    expect(p.className).toBe('Grade 7');
    expect(p.academicYearName).toBe('2025-2026');
    expect(p.termName).toBe('Term 1');
    expect(p.subjects).toHaveLength(2);
    expect(p.subjects.every((s) => typeof s.value === 'number' && s.grade)).toBe(true);
    expect(p.subjectsCounted).toBe(2);
    expect(p.subjectsTotal).toBe(2);
    expect(p.average).toBeCloseTo(55, 10);
    expect(p.rank).toBe(3);
    expect(p.rankOutOf).toBe(3);
    expect(p.status).toBe('COMPLETE');
    expect(Array.isArray(p.gradingBands)).toBe(true);
    expect(p.gradingBands.length).toBeGreaterThan(0);
    expect(p.missingPolicy).toBeTruthy();
    expect(String(p.configHash)).toMatch(/^[0-9a-f]{40}$/);
  });

  test('students without an authoritative TermResult are reported as failures', async () => {
    // No generateTermResults call → no TermResult rows.
    const out = await genReports(c, c.t1._id);
    expect(out.success).toBe(false);
    expect(out.results).toHaveLength(0);
    expect(out.failures).toHaveLength(3);
    expect(out.failures[0].error).toMatch(/No authoritative term result/i);
  });

  test('regeneration creates a NEW version and resets the card to GENERATED', async () => {
    await genTerm(c, c.t1._id);
    const first = await genReports(c, c.t1._id);
    const cardId = first.results[0].card._id;
    await transition(cardId, 'review', c.school._id);
    await transition(cardId, 'approve', c.school._id);
    await transition(cardId, 'publish', c.school._id);

    await genReports(c, c.t1._id);
    const card = await ReportCard.findById(cardId);
    expect(card.currentVersion).toBe(2);
    expect(card.status).toBe('GENERATED');
    const versions = await ReportVersion.find({ reportCard: cardId }).sort({ version: 1 });
    expect(versions.map((v) => v.version)).toEqual([1, 2]);
    expect(versions[0].status).toBe('PUBLISHED'); // v1 untouched
  });
});

// ─── 53. Lifecycle transitions ──────────────────────────────────────────────

describe('53. Report lifecycle transitions', () => {
  let c = {};
  let cardId;
  beforeEach(async () => {
    c = await seedSchool();
    await genTerm(c, c.t1._id);
    const out = await genReports(c, c.t1._id);
    cardId = out.results.find((r) => r.version.payload.student.admissionNumber === 'P5001').card._id;
  });

  test('valid path GENERATED → REVIEWED → APPROVED → PUBLISHED', async () => {
    const r1 = await transition(cardId, 'review', c.school._id, { note: 'checked' });
    expect(r1.card.status).toBe('REVIEWED');
    expect(r1.version.status).toBe('REVIEWED');
    expect(r1.version.reviewNote).toBe('checked');
    expect(r1.version.reviewedAt).toBeTruthy();

    const r2 = await transition(cardId, 'approve', c.school._id, { note: 'ok' });
    expect(r2.card.status).toBe('APPROVED');
    expect(r2.version.approvedAt).toBeTruthy();

    const r3 = await transition(cardId, 'publish', c.school._id);
    expect(r3.card.status).toBe('PUBLISHED');
    expect(r3.version.status).toBe('PUBLISHED');
    expect(r3.card.publishedAt).toBeTruthy();
    expect(r3.republished).toBe(false); // first publication
  });

  test('approve from GENERATED is rejected (invalid transition)', async () => {
    await expect(transition(cardId, 'approve', c.school._id)).rejects.toThrow(/Cannot approve .* state GENERATED/i);
    const card = await ReportCard.findById(cardId);
    expect(card.status).toBe('GENERATED'); // unchanged
  });

  test('review from REVIEWED is rejected (no double review)', async () => {
    await transition(cardId, 'review', c.school._id);
    await expect(transition(cardId, 'review', c.school._id)).rejects.toThrow(/Cannot review .* state REVIEWED/i);
  });

  test('publish from GENERATED skips review/approve and is rejected', async () => {
    await expect(transition(cardId, 'publish', c.school._id)).rejects.toThrow(/Cannot publish .* state GENERATED/i);
  });

  test('review after publication is rejected', async () => {
    await transition(cardId, 'review', c.school._id);
    await transition(cardId, 'approve', c.school._id);
    await transition(cardId, 'publish', c.school._id);
    await expect(transition(cardId, 'review', c.school._id)).rejects.toThrow(/Cannot review .* state PUBLISHED/i);
    await expect(transition(cardId, 'approve', c.school._id)).rejects.toThrow(/Cannot approve .* state PUBLISHED/i);
  });

  test('unknown action is rejected', async () => {
    await expect(transition(cardId, 'unpublish', c.school._id)).rejects.toThrow(/Unknown report action/i);
  });

  test('cross-school transition is rejected as not found (IDOR)', async () => {
    const otherSchool = new ObjectId();
    await expect(transition(cardId, 'review', otherSchool)).rejects.toThrow(/not found/i);
  });

  test('stale report cannot be reviewed until regenerated', async () => {
    // A mark correction invalidates results AND report cards (production hook).
    await assessmentMarkService.recordMark({
      school: c.school._id, assessmentId: c.mathT1a._id, studentId: c.sA._id,
      score: 40, entered: true, recordedBy: c.userId, reason: 'remarked',
    });
    const card = await ReportCard.findById(cardId);
    expect(card.isStale).toBe(true);
    await expect(transition(cardId, 'review', c.school._id)).rejects.toThrow(/stale/i);
  });

  test('publication re-verifies the source result still matches', async () => {
    await transition(cardId, 'review', c.school._id);
    await transition(cardId, 'approve', c.school._id);
    // Underlying marks change AFTER approval → source TermResult is stale.
    await assessmentMarkService.recordMark({
      school: c.school._id, assessmentId: c.mathT1a._id, studentId: c.sA._id,
      score: 40, entered: true, recordedBy: c.userId, reason: 'remarked',
    });
    await expect(transition(cardId, 'publish', c.school._id)).rejects.toThrow(/stale|changed/i);
    const card = await ReportCard.findById(cardId);
    expect(card.status).toBe('APPROVED'); // not published
  });
});

// ─── 54. Versioned snapshots & preservation ─────────────────────────────────

describe('54. Version preservation and historical snapshots', () => {
  let c = {};
  beforeEach(async () => { c = await seedSchool(); });

  test('published v1 payload is never overwritten by regeneration', async () => {
    await genTerm(c, c.t1._id);
    const first = await genReports(c, c.t1._id);
    const cardId = first.results.find((r) => r.version.payload.student.admissionNumber === 'P5001').card._id;
    await transition(cardId, 'review', c.school._id);
    await transition(cardId, 'approve', c.school._id);
    await transition(cardId, 'publish', c.school._id);

    const v1Before = (await ReportVersion.findOne({ reportCard: cardId, version: 1 })).toObject();
    const frozenPayload = JSON.parse(JSON.stringify(v1Before.payload));

    // Underlying marks change → results recalculated → report regenerated as v2.
    await assessmentMarkService.recordMark({
      school: c.school._id, assessmentId: c.mathT1a._id, studentId: c.sA._id,
      score: 40, entered: true, recordedBy: c.userId, reason: 'remarked',
    });
    await genTerm(c, c.t1._id);
    await genReports(c, c.t1._id);

    const v1After = (await ReportVersion.findOne({ reportCard: cardId, version: 1 })).toObject();
    expect(v1After.status).toBe('PUBLISHED');
    expect(JSON.parse(JSON.stringify(v1After.payload))).toEqual(frozenPayload);
    expect(v1After.publishedAt).toEqual(v1Before.publishedAt);

    // The card now points at v2 in GENERATED state.
    const card = await ReportCard.findById(cardId);
    expect(card.currentVersion).toBe(2);
    expect(card.status).toBe('GENERATED');
    expect(card.isStale).toBe(false);
  });

  test('historical version read returns exactly what was recorded then', async () => {
    await genTerm(c, c.t1._id);
    const first = await genReports(c, c.t1._id);
    const cardId = first.results[0].card._id;
    await transition(cardId, 'review', c.school._id, { note: 'v1 review' });
    await transition(cardId, 'approve', c.school._id);
    await transition(cardId, 'publish', c.school._id);
    const v1Recorded = JSON.parse(JSON.stringify(
      (await ReportVersion.findOne({ reportCard: cardId, version: 1 })).payload,
    ));

    await assessmentMarkService.recordMark({
      school: c.school._id, assessmentId: c.mathT1a._id, studentId: c.sA._id,
      score: 40, entered: true, recordedBy: c.userId, reason: 'remarked',
    });
    await genTerm(c, c.t1._id);
    const regen = await genReports(c, c.t1._id);
    expect(regen.results).toHaveLength(3);

    const historical = await reportService.getReportVersion(cardId, 1, c.school._id);
    expect(historical.version.version).toBe(1);
    expect(historical.version.status).toBe('PUBLISHED');
    expect(JSON.parse(JSON.stringify(historical.version.payload))).toEqual(v1Recorded);

    const current = await reportService.getReportDetail(cardId, c.school._id);
    expect(current.version.version).toBe(2);
    expect(current.card.currentVersion).toBe(2);
  });

  test('version list exposes every version with its own status', async () => {
    await genTerm(c, c.t1._id);
    const first = await genReports(c, c.t1._id);
    const cardId = first.results[0].card._id;
    await transition(cardId, 'review', c.school._id);
    await transition(cardId, 'approve', c.school._id);
    await transition(cardId, 'publish', c.school._id);
    await genReports(c, c.t1._id);

    const versions = await reportService.listVersions(cardId, c.school._id);
    expect(versions.map((v) => ({ v: v.version, s: v.status })))
      .toEqual([{ v: 2, s: 'GENERATED' }, { v: 1, s: 'PUBLISHED' }]);
  });
});

// ─── 55. Staleness & publication after correction ───────────────────────────

describe('55. Stale reports and publication after correction', () => {
  let c = {};
  let cardId;
  beforeEach(async () => {
    c = await seedSchool();
    await genTerm(c, c.t1._id);
    const out = await genReports(c, c.t1._id);
    cardId = out.results.find((r) => r.version.payload.student.admissionNumber === 'P5001').card._id;
  });

  test('mark change flags affected reports stale (production hook)', async () => {
    expect((await ReportCard.findById(cardId)).isStale).toBe(false);
    await assessmentMarkService.recordMark({
      school: c.school._id, assessmentId: c.mathT1a._id, studentId: c.sA._id,
      score: 40, entered: true, recordedBy: c.userId, reason: 'remarked',
    });
    expect((await ReportCard.findById(cardId)).isStale).toBe(true);
    // Source results are flagged too.
    const tr = await TermResult.findOne({ student: c.sA._id, term: c.t1._id, resultType: 'TERM' });
    expect(tr.isStale).toBe(true);
  });

  test('grading-scale change flags every report for the year stale', async () => {
    await transition(cardId, 'review', c.school._id);
    await transition(cardId, 'approve', c.school._id);
    await transition(cardId, 'publish', c.school._id);

    await resultService.saveGradingScale({
      school: c.school._id, academicYear: c.year._id, name: 'Default', createdBy: c.userId,
      bands: [
        { grade: 'A', minPercentage: 75, maxPercentage: 100, remark: 'Excellent' },
        { grade: 'B', minPercentage: 65, maxPercentage: 74, remark: 'Good' },
        { grade: 'C', minPercentage: 50, maxPercentage: 64, remark: 'Fair' },
        { grade: 'D', minPercentage: 35, maxPercentage: 49, remark: 'Poor' },
        { grade: 'E', minPercentage: 0, maxPercentage: 34, remark: 'Fail' },
      ],
    });

    const card = await ReportCard.findById(cardId);
    expect(card.isStale).toBe(true);
    expect(card.status).toBe('PUBLISHED'); // published state recorded, but stale
    // Even a PUBLISHED stale card blocks further lifecycle actions.
    await expect(transition(cardId, 'review', c.school._id)).rejects.toThrow(/state PUBLISHED/i);
  });

  test('full correction flow: recalc → regenerate → review → approve → publish', async () => {
    await transition(cardId, 'review', c.school._id);
    await transition(cardId, 'approve', c.school._id);
    await transition(cardId, 'publish', c.school._id);
    const v1Payload = JSON.parse(JSON.stringify(
      (await ReportVersion.findOne({ reportCard: cardId, version: 1 })).payload,
    ));
    expect(v1Payload.average).toBeCloseTo(85, 10);

    // 1. Correct a mark (stale flags propagate).
    await assessmentMarkService.recordMark({
      school: c.school._id, assessmentId: c.mathT1a._id, studentId: c.sA._id,
      score: 40, entered: true, recordedBy: c.userId, reason: 'appeal upheld',
    });
    expect((await ReportCard.findById(cardId)).isStale).toBe(true);

    // 2. Recalculate the authoritative results for the scope.
    await genTerm(c, c.t1._id);

    // 3. Regenerate report → v2 (fresh, not stale), v1 remains published.
    const regen = await genReports(c, c.t1._id);
    expect(regen.success).toBe(true);
    const card = await ReportCard.findById(cardId);
    expect(card.currentVersion).toBe(2);
    expect(card.status).toBe('GENERATED');
    expect(card.isStale).toBe(false);

    // 4. v2 carries the corrected average; v1 keeps the original.
    const v2 = await ReportVersion.findOne({ reportCard: cardId, version: 2 });
    expect(v2.payload.average).toBeCloseTo(90, 10); // Math 90, Science 90
    expect(v2.payload.average).not.toBe(v1Payload.average);
    const v1 = await ReportVersion.findOne({ reportCard: cardId, version: 1 });
    expect(JSON.parse(JSON.stringify(v1.payload))).toEqual(v1Payload);

    // 5. Full re-review → re-approve → republish.
    const r1 = await transition(cardId, 'review', c.school._id);
    const r2 = await transition(cardId, 'approve', c.school._id);
    const r3 = await transition(cardId, 'publish', c.school._id);
    expect(r3.card.status).toBe('PUBLISHED');
    expect(r3.republished).toBe(true); // version > 1 → audited as republish
    expect(r1.version.version).toBe(2);
    expect(r2.version.version).toBe(2);
  });

  test('invalidate flags a published report stale without touching versions', async () => {
    await transition(cardId, 'review', c.school._id);
    await transition(cardId, 'approve', c.school._id);
    await transition(cardId, 'publish', c.school._id);
    const before = (await ReportVersion.findOne({ reportCard: cardId, version: 1 })).toObject();

    const card = await reportService.invalidate({ reportId: cardId, school: c.school._id });
    expect(card.isStale).toBe(true);
    expect(card.status).toBe('PUBLISHED'); // history preserved

    const after = (await ReportVersion.findOne({ reportCard: cardId, version: 1 })).toObject();
    expect(after.payload).toEqual(before.payload);
    expect(after.status).toBe('PUBLISHED');
  });
});

// ─── 56. HTTP authorization, scoping, IDOR, audit ───────────────────────────

describe('56. HTTP authorization, scoping and IDOR', () => {
  const TEACHER_IN = '64a000000000000000000011'; // teaches (Y, T1, class, math)
  const TEACHER_OUT = '64a000000000000000000012'; // no assignments at all
  const CLASST_IN = '64a000000000000000000013'; // class teacher of (Y, T1, class)
  const CLASST_OUT = '64a000000000000000000014'; // class teacher of (Y, T2, class)

  let c = {};
  let genBody;

  beforeEach(async () => {
    c = await seedSchool({ schoolId: SCHOOL_ID });
    await genTerm(c, c.t1._id);
    genBody = {
      academicYear: c.year._id.toString(),
      term: c.t1._id.toString(),
      class: c.klass._id.toString(),
    };
    await TeacherAssignment.create({
      school: c.school._id, teacher: TEACHER_IN, academicYear: c.year._id,
      term: c.t1._id, class: c.klass._id, subject: c.math._id, assignedBy: c.userId,
    });
    await ClassTeacherAssignment.create({
      school: c.school._id, teacher: CLASST_IN, academicYear: c.year._id,
      term: c.t1._id, class: c.klass._id, assignedBy: c.userId,
    });
    await ClassTeacherAssignment.create({
      school: c.school._id, teacher: CLASST_OUT, academicYear: c.year._id,
      term: c.t2._id, class: c.klass._id, assignedBy: c.userId,
    });
  });

  const gen = (app, role, userId) => authPost(app, '/api/reports/generate', genBody, role, userId);
  const SOME_ID = '64a000000000000000000099';

  test('TEACHER cannot generate reports (403)', async () => {
    const res = await gen(buildApp(), 'TEACHER', TEACHER_IN);
    expect(res.status).toBe(403);
  });

  test('CLASS_TEACHER cannot generate reports (403)', async () => {
    const res = await gen(buildApp(), 'CLASS_TEACHER', CLASST_IN);
    expect(res.status).toBe(403);
  });

  test('TEACHER cannot review/approve/publish/invalidate (403)', async () => {
    const app = buildApp();
    for (const action of ['review', 'approve', 'publish', 'invalidate']) {
      const res = await authPost(app, `/api/reports/${SOME_ID}/${action}`, {}, 'TEACHER', TEACHER_IN);
      expect(res.status).toBe(403);
    }
  });

  test('CLASS_TEACHER cannot approve/publish/invalidate (403) but may review (role-level)', async () => {
    const app = buildApp();
    for (const action of ['approve', 'publish', 'invalidate']) {
      const res = await authPost(app, `/api/reports/${SOME_ID}/${action}`, {}, 'CLASS_TEACHER', CLASST_IN);
      expect(res.status).toBe(403);
    }
    // Role allowed → reaches the scope check; unknown report → 404 not 403.
    const review = await authPost(app, `/api/reports/${SOME_ID}/review`, {}, 'CLASS_TEACHER', CLASST_IN);
    expect(review.status).toBe(404);
  });

  test('ADMIN generation succeeds and is audited', async () => {
    const res = await gen(buildApp(), 'ADMIN');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.succeeded).toBe(3);
    expect(AuditLog.create.mock.calls.map((cl) => cl[0].action)).toContain('REPORT_GENERATED');
  });

  test('unauthenticated and CSRF-less requests are rejected', async () => {
    const app = buildApp();
    const unauth = await request(app).get('/api/reports');
    expect(unauth.status).toBe(401);

    authService.getUserFromPayload.mockResolvedValue(makeUser({ role: 'ADMIN' }));
    const token = issueToken('ADMIN');
    const noCsrf = await request(app)
      .post('/api/reports/generate')
      .set('Cookie', makeAuthCookie(token))
      .send(genBody);
    expect(noCsrf.status).toBe(403);
  });

  test('validation failures return 400 (bad id, bad query)', async () => {
    const app = buildApp();
    const badId = await authGet(app, '/api/reports/not-an-id', 'ADMIN');
    expect(badId.status).toBe(400);
    const badQuery = await authGet(app, '/api/reports?stale=maybe', 'ADMIN');
    expect(badQuery.status).toBe(400);
  });

  test('staff list scoping: teachers and class teachers only see their tuples', async () => {
    const app = buildApp();
    expect((await gen(app, 'ADMIN')).status).toBe(200);

    const adminList = await authGet(app, '/api/reports', 'ADMIN');
    expect(adminList.body.reports).toHaveLength(3);

    const inList = await authGet(app, '/api/reports', 'TEACHER', TEACHER_IN);
    expect(inList.status).toBe(200);
    expect(inList.body.reports).toHaveLength(3);

    const outList = await authGet(app, '/api/reports', 'TEACHER', TEACHER_OUT);
    expect(outList.status).toBe(200);
    expect(outList.body.reports).toHaveLength(0);

    const ctIn = await authGet(app, '/api/reports', 'CLASS_TEACHER', CLASST_IN);
    expect(ctIn.body.reports).toHaveLength(3);

    const ctOut = await authGet(app, '/api/reports', 'CLASS_TEACHER', CLASST_OUT);
    expect(ctOut.body.reports).toHaveLength(0);
  });

  test('detail IDOR: out-of-scope staff and other schools get 404', async () => {
    const app = buildApp();
    expect((await gen(app, 'ADMIN')).status).toBe(200);
    const list = await ReportCard.find({ school: SCHOOL_ID }).lean();
    const cardId = list[0]._id.toString();

    const inScope = await authGet(app, `/api/reports/${cardId}`, 'TEACHER', TEACHER_IN);
    expect(inScope.status).toBe(200);

    const outScope = await authGet(app, `/api/reports/${cardId}`, 'TEACHER', TEACHER_OUT);
    expect(outScope.status).toBe(404);

    const ctOut = await authGet(app, `/api/reports/${cardId}`, 'CLASS_TEACHER', CLASST_OUT);
    expect(ctOut.status).toBe(404);

    // Cross-school: a report belonging to a different school is invisible.
    const foreign = await ReportCard.create({
      school: new ObjectId(), academicYear: c.year._id, term: c.t1._id,
      class: c.klass._id, student: c.sB._id, resultType: 'TERM', status: 'GENERATED',
    });
    const cross = await authGet(app, `/api/reports/${foreign._id}`, 'ADMIN');
    expect(cross.status).toBe(404);
  });

  test('full lifecycle over HTTP with audit trail', async () => {
    const app = buildApp();
    expect((await gen(app, 'ADMIN')).status).toBe(200);
    const cardId = (await ReportCard.find({ school: SCHOOL_ID }).lean())[0]._id.toString();

    // Class teacher reviews within assigned class scope.
    const reviewed = await authPost(app, `/api/reports/${cardId}/review`, { note: 'ok' }, 'CLASS_TEACHER', CLASST_IN);
    expect(reviewed.status).toBe(200);

    // Approval/publication are management duties.
    const teacherApprove = await authPost(app, `/api/reports/${cardId}/approve`, {}, 'CLASS_TEACHER', CLASST_IN);
    expect(teacherApprove.status).toBe(403);
    const approved = await authPost(app, `/api/reports/${cardId}/approve`, { note: 'ok' }, 'DOS');
    expect(approved.status).toBe(200);
    const teacherPublish = await authPost(app, `/api/reports/${cardId}/publish`, {}, 'TEACHER', TEACHER_IN);
    expect(teacherPublish.status).toBe(403);
    const published = await authPost(app, `/api/reports/${cardId}/publish`, {}, 'DOS');
    expect(published.status).toBe(200);
    const invalidated = await authPost(app, `/api/reports/${cardId}/invalidate`, { reason: 'error found' }, 'ADMIN');
    expect(invalidated.status).toBe(200);

    const actions = AuditLog.create.mock.calls.map((cl) => cl[0].action);
    for (const a of ['REPORT_GENERATED', 'REPORT_REVIEWED', 'REPORT_APPROVED', 'REPORT_PUBLISHED', 'REPORT_INVALIDATED']) {
      expect(actions).toContain(a);
    }
    const card = await ReportCard.findById(cardId);
    expect(card.status).toBe('PUBLISHED');
    expect(card.isStale).toBe(true); // invalidated
  });

  test('correction and republish over HTTP is audited as REPORT_REPUBLISHED', async () => {
    const app = buildApp();
    expect((await gen(app, 'ADMIN')).status).toBe(200);
    const cardId = (await ReportCard.find({ school: SCHOOL_ID }).lean())[0]._id.toString();

    expect((await authPost(app, `/api/reports/${cardId}/review`, {}, 'CLASS_TEACHER', CLASST_IN)).status).toBe(200);
    expect((await authPost(app, `/api/reports/${cardId}/approve`, {}, 'DOS')).status).toBe(200);
    expect((await authPost(app, `/api/reports/${cardId}/publish`, {}, 'DOS')).status).toBe(200);

    // Marks change → recalculate → regenerate (v2) → re-review → re-approve → republish.
    await assessmentMarkService.recordMark({
      school: c.school._id, assessmentId: c.mathT1a._id, studentId: c.sA._id,
      score: 40, entered: true, recordedBy: c.userId, reason: 'appeal upheld',
    });
    await genTerm(c, c.t1._id);
    expect((await gen(app, 'ADMIN')).status).toBe(200);

    expect((await authPost(app, `/api/reports/${cardId}/review`, {}, 'CLASS_TEACHER', CLASST_IN)).status).toBe(200);
    expect((await authPost(app, `/api/reports/${cardId}/approve`, {}, 'ADMIN')).status).toBe(200);
    const republished = await authPost(app, `/api/reports/${cardId}/publish`, {}, 'ADMIN');
    expect(republished.status).toBe(200);

    const actions = AuditLog.create.mock.calls.map((cl) => cl[0].action);
    expect(actions).toContain('REPORT_REPUBLISHED');

    const card = await ReportCard.findById(cardId);
    expect(card.status).toBe('PUBLISHED');
    expect(card.currentVersion).toBe(2);
    // v1 published snapshot preserved.
    const v1 = await ReportVersion.findOne({ reportCard: cardId, version: 1 });
    expect(v1.status).toBe('PUBLISHED');
  });
});

// ─── 57. Screen/PDF consistency & report states ─────────────────────────────

describe('57. Screen/PDF authoritative source and report states', () => {
  let c = {};
  let genBody;
  beforeEach(async () => {
    c = await seedSchool({ schoolId: SCHOOL_ID });
    await genTerm(c, c.t1._id);
    genBody = {
      academicYear: c.year._id.toString(),
      term: c.t1._id.toString(),
      class: c.klass._id.toString(),
    };
  });

  test('detail response equals the frozen version and the source TermResult', async () => {
    const app = buildApp();
    expect((await authPost(app, '/api/reports/generate', genBody, 'ADMIN')).status).toBe(200);
    const cardId = (await ReportCard.find({ school: SCHOOL_ID }).lean())[0]._id.toString();

    const res = await authGet(app, `/api/reports/${cardId}`, 'ADMIN');
    expect(res.status).toBe(200);

    // Exactly the frozen ReportVersion payload — what the print DOM renders.
    const frozen = await ReportVersion.findOne({ reportCard: cardId, version: 1 }).lean();
    expect(JSON.parse(JSON.stringify(res.body.version.payload)))
      .toEqual(JSON.parse(JSON.stringify(frozen.payload)));

    // …and that payload is a verbatim copy of the authoritative TermResult.
    const card = await ReportCard.findById(cardId).lean();
    const tr = await TermResult.findById(card.sourceTermResult).lean();
    expect(res.body.version.payload.average).toBe(tr.average);
    expect(res.body.version.payload.rank).toBe(tr.rank);
    expect(res.body.version.payload.grade).toBe(tr.grade);
    expect(res.body.version.payload.configHash).toBe(tr.configHash);
  });

  test('payload contains every field the A4 report document renders', async () => {
    const app = buildApp();
    expect((await authPost(app, '/api/reports/generate', genBody, 'ADMIN')).status).toBe(200);
    const cardId = (await ReportCard.find({ school: SCHOOL_ID }).lean())[0]._id.toString();
    const p = (await authGet(app, `/api/reports/${cardId}`, 'ADMIN')).body.version.payload;

    const required = [
      'schoolName', 'student', 'className', 'academicYearName', 'termName',
      'resultType', 'termsIncluded', 'subjects', 'subjectsCounted', 'subjectsTotal',
      'average', 'grade', 'rank', 'rankOutOf', 'status', 'missingPolicy',
      'gradingBands', 'sourceTermResult', 'configHash', 'calculationVersion',
    ];
    for (const key of required) expect(p).toHaveProperty(key);
    expect(p.student).toHaveProperty('admissionNumber');
    expect(p.student).toHaveProperty('firstName');
    expect(p.student).toHaveProperty('lastName');
    for (const s of p.subjects) {
      expect(s).toHaveProperty('subjectName');
      expect(s).toHaveProperty('value');
      expect(s).toHaveProperty('grade');
      expect(s).toHaveProperty('status');
    }
    for (const b of p.gradingBands) {
      expect(b).toHaveProperty('grade');
      expect(b).toHaveProperty('minPercentage');
      expect(b).toHaveProperty('maxPercentage');
    }
  });

  test('incomplete reports surface status INCOMPLETE with null average and rank', async () => {
    // No assessments at all → authoritative results are INCOMPLETE (never a fake 0).
    await Assessment.deleteMany({});
    await AssessmentMark.deleteMany({});
    await genTerm(c, c.t1._id);

    const app = buildApp();
    expect((await authPost(app, '/api/reports/generate', genBody, 'ADMIN')).status).toBe(200);
    const cardId = (await ReportCard.find({ school: SCHOOL_ID }).lean())[0]._id.toString();
    const p = (await authGet(app, `/api/reports/${cardId}`, 'ADMIN')).body.version.payload;

    expect(p.status).toBe('INCOMPLETE');
    expect(p.average).toBeNull();
    expect(p.rank).toBeNull();
    expect(p.subjects.every((s) => s.status === 'INCOMPLETE')).toBe(true);
  });

  test('list filters by status and staleness', async () => {
    const app = buildApp();
    expect((await authPost(app, '/api/reports/generate', genBody, 'ADMIN')).status).toBe(200);
    const cardId = (await ReportCard.find({ school: SCHOOL_ID }).lean())[0]._id.toString();
    expect((await authPost(app, `/api/reports/${cardId}/review`, {}, 'ADMIN')).status).toBe(200);
    expect((await authPost(app, `/api/reports/${cardId}/approve`, {}, 'ADMIN')).status).toBe(200);
    expect((await authPost(app, `/api/reports/${cardId}/publish`, {}, 'ADMIN')).status).toBe(200);

    const published = await authGet(app, '/api/reports?status=PUBLISHED', 'ADMIN');
    expect(published.body.reports).toHaveLength(1);
    const generated = await authGet(app, '/api/reports?status=GENERATED', 'ADMIN');
    expect(generated.body.reports).toHaveLength(2);

    expect((await authPost(app, `/api/reports/${cardId}/invalidate`, { reason: 'x' }, 'ADMIN')).status).toBe(200);
    const staleOnly = await authGet(app, '/api/reports?stale=true', 'ADMIN');
    expect(staleOnly.body.reports).toHaveLength(1);
    expect(staleOnly.body.reports[0]._id).toBe(cardId);
    const freshOnly = await authGet(app, '/api/reports?stale=false', 'ADMIN');
    expect(freshOnly.body.reports).toHaveLength(2);
  });
});
