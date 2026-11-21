'use strict';

/**
 * KIPS-SMS Phase 3 — Assessments, Marks, Corrections & Mark Engine Tests
 *
 * Covers: authorization (role + object-level), assessment validation,
 *         mark validation (zero vs missing), correction history,
 *         mark engine calculations, CSRF, mass assignment, audit logging.
 */

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/kips_sms_test_p3';
process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_characters_long_x';
process.env.JWT_EXPIRES_IN = '1h';
process.env.COOKIE_SECRET = 'test_cookie_secret_at_least_32_characters_x';
process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
process.env.BCRYPT_ROUNDS = '4';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../services/authService', () => {
  const actual = jest.requireActual('../services/authService');
  return { ...actual, getUserFromPayload: jest.fn(), login: jest.fn() };
});

jest.mock('../models/AuditLog', () => ({ create: jest.fn(), index: jest.fn() }));

const authService = require('../services/authService');
const AuditLog = require('../models/AuditLog');
const { buildApp } = require('./testApp');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SECRET = process.env.JWT_SECRET;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
const AUTH_COOKIE = 'kips_auth';
const CSRF_SECRET_COOKIE = 'kips_csrf_secret';

const SCHOOL_ID = '64a000000000000000000099';
const SCHOOL_ID_2 = '64a000000000000000000088';
const USER_ID = '64a000000000000000000001';
const TEACHER_ID = '64a000000000000000000015';
const YEAR_ID = '64a000000000000000000010';
const TERM_ID = '64a000000000000000000011';
const CLASS_ID = '64a000000000000000000012';
const STUDENT_ID = '64a000000000000000000013';
const SUBJECT_ID = '64a000000000000000000014';
const YEAR_ID_2 = '64a000000000000000000020';
const TERM_ID_2 = '64a000000000000000000021';
const CLASS_ID_2 = '64a000000000000000000022';
const SUBJECT_ID_2 = '64a000000000000000000023';
const TEACHER_2_ID = '64a000000000000000000024';
const ASSESSMENT_ID = '64a000000000000000000017';
const MARK_ID = '64a000000000000000000018';

const makeUser = (overrides = {}) => ({
  _id: USER_ID,
  school: { _id: SCHOOL_ID, name: 'KIPS School', code: 'KIPS', status: 'active' },
  firstName: 'Test',
  lastName: 'User',
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

const authPut = async (app, url, body, role = 'ADMIN', userId = USER_ID) => {
  authService.getUserFromPayload.mockResolvedValue(makeUser({ role, _id: userId }));
  const token = issueToken(role, userId);
  const { csrfToken, csrfSecretCookie } = await getCsrf(app);
  return request(app)
    .put(url)
    .set('Cookie', [makeAuthCookie(token), csrfSecretCookie].filter(Boolean).join('; '))
    .set('x-csrf-token', csrfToken)
    .send(body);
};

/**
 * Chainable thenable mock for Mongoose query builders that end in an await
 * (e.g. Model.findById(id).populate(...).populate(...)).
 */
const populateChain = (doc) => {
  const chain = {
    populate: () => chain,
    select: () => chain,
    sort: () => chain,
    lean: () => chain,
    then: (onF, onR) => Promise.resolve(doc).then(onF, onR),
  };
  return chain;
};

/** Standard in-scope assessment document. */
const assessmentDoc = (overrides = {}) => ({
  _id: ASSESSMENT_ID,
  school: SCHOOL_ID,
  academicYear: YEAR_ID,
  term: TERM_ID,
  class: CLASS_ID,
  subject: SUBJECT_ID,
  type: 'TEST',
  name: 'Quiz 1',
  maxMarks: 50,
  weight: 20,
  status: 'ACTIVE',
  ...overrides,
});

const validAssessmentBody = {
  academicYear: YEAR_ID,
  term: TERM_ID,
  class: CLASS_ID,
  subject: SUBJECT_ID,
  type: 'TEST',
  name: 'Quiz 1',
  maxMarks: 50,
  weight: 20,
  startDate: '2025-01-01',
  dueDate: '2025-01-07',
};

/** Mock the four scope entities as belonging to SCHOOL_ID / YEAR_ID. */
const mockValidScope = () => {
  const AcademicYear = require('../models/AcademicYear');
  const Term = require('../models/Term');
  const Class = require('../models/Class');
  const Subject = require('../models/Subject');
  const Assessment = require('../models/Assessment');
  jest.spyOn(AcademicYear, 'findById').mockResolvedValue({ _id: YEAR_ID, school: SCHOOL_ID });
  jest.spyOn(Term, 'findById').mockResolvedValue({ _id: TERM_ID, school: SCHOOL_ID, academicYear: YEAR_ID });
  jest.spyOn(Class, 'findById').mockResolvedValue({ _id: CLASS_ID, school: SCHOOL_ID, academicYear: YEAR_ID });
  jest.spyOn(Subject, 'findById').mockResolvedValue({ _id: SUBJECT_ID, school: SCHOOL_ID });
  jest.spyOn(Assessment, 'find').mockReturnValue({
    select: () => ({ lean: () => Promise.resolve([]) }),
  });
};

beforeEach(() => {
  authService.getUserFromPayload.mockReset();
  AuditLog.create.mockReset();
  AuditLog.create.mockResolvedValue({});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── 31. Assessment Validators ───────────────────────────────────────────────

describe('31. Assessment Validators', () => {
  const { createAssessmentSchema, updateAssessmentSchema } = require('../validators/assessmentValidators');

  test('valid assessment passes', () => {
    const { error } = createAssessmentSchema.validate(validAssessmentBody);
    expect(error).toBeUndefined();
  });

  test('maxMarks of 0 fails', () => {
    const { error } = createAssessmentSchema.validate({ ...validAssessmentBody, maxMarks: 0 });
    expect(error).toBeDefined();
  });

  test('negative maxMarks fails', () => {
    const { error } = createAssessmentSchema.validate({ ...validAssessmentBody, maxMarks: -5 });
    expect(error).toBeDefined();
  });

  test('negative weight fails', () => {
    const { error } = createAssessmentSchema.validate({ ...validAssessmentBody, weight: -1 });
    expect(error).toBeDefined();
  });

  test('weight above 100 fails', () => {
    const { error } = createAssessmentSchema.validate({ ...validAssessmentBody, weight: 101 });
    expect(error).toBeDefined();
  });

  test('invalid assessment type fails', () => {
    const { error } = createAssessmentSchema.validate({ ...validAssessmentBody, type: 'HOMEWORK2' });
    expect(error).toBeDefined();
  });

  test('invalid status fails on update', () => {
    const { error } = updateAssessmentSchema.validate({ status: 'PUBLISHED' });
    expect(error).toBeDefined();
  });

  test('invalid ObjectId for class fails', () => {
    const { error } = createAssessmentSchema.validate({ ...validAssessmentBody, class: 'not-an-id' });
    expect(error).toBeDefined();
  });

  test('dueDate before startDate fails at service level', async () => {
    const assessmentService = require('../services/assessmentService');
    mockValidScope();
    await expect(assessmentService.create({
      school: SCHOOL_ID,
      ...validAssessmentBody,
      startDate: '2025-02-01',
      dueDate: '2025-01-01',
      createdBy: USER_ID,
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('createAssessmentSchema strips school, createdBy and _id (mass assignment)', () => {
    const { value } = createAssessmentSchema.validate({
      ...validAssessmentBody,
      school: SCHOOL_ID_2,
      createdBy: 'injected',
      updatedBy: 'injected',
      _id: 'injected',
    }, { stripUnknown: true });
    expect(value.school).toBeUndefined();
    expect(value.createdBy).toBeUndefined();
    expect(value.updatedBy).toBeUndefined();
    expect(value._id).toBeUndefined();
  });
});

// ─── 32. Mark Validators ─────────────────────────────────────────────────────

describe('32. Mark Validators', () => {
  const { recordMarkSchema, bulkRecordMarksSchema } = require('../validators/assessmentValidators');

  const validMark = {
    assessmentId: ASSESSMENT_ID,
    studentId: STUDENT_ID,
    score: 42,
    entered: true,
  };

  test('valid mark passes', () => {
    const { error } = recordMarkSchema.validate(validMark);
    expect(error).toBeUndefined();
  });

  test('score of 0 passes (zero is a valid score)', () => {
    const { error } = recordMarkSchema.validate({ ...validMark, score: 0 });
    expect(error).toBeUndefined();
  });

  test('negative score fails', () => {
    const { error } = recordMarkSchema.validate({ ...validMark, score: -1 });
    expect(error).toBeDefined();
  });

  test('missing entered flag fails', () => {
    const { error } = recordMarkSchema.validate({ assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 10 });
    expect(error).toBeDefined();
  });

  test('missing mark (entered=false, score null) passes', () => {
    const { error } = recordMarkSchema.validate({ ...validMark, score: null, entered: false });
    expect(error).toBeUndefined();
  });

  test('invalid studentId fails', () => {
    const { error } = recordMarkSchema.validate({ ...validMark, studentId: 'nope' });
    expect(error).toBeDefined();
  });

  test('mark schema strips school / recordedBy (mass assignment)', () => {
    const { value } = recordMarkSchema.validate({
      ...validMark,
      school: SCHOOL_ID_2,
      recordedBy: TEACHER_2_ID,
      updatedBy: TEACHER_2_ID,
    }, { stripUnknown: true });
    expect(value.school).toBeUndefined();
    expect(value.recordedBy).toBeUndefined();
    expect(value.updatedBy).toBeUndefined();
  });

  test('bulk schema requires at least one mark and entered flags', () => {
    const bad = bulkRecordMarksSchema.validate({ assessmentId: ASSESSMENT_ID, marks: [] });
    expect(bad.error).toBeDefined();
    const good = bulkRecordMarksSchema.validate({
      assessmentId: ASSESSMENT_ID,
      marks: [{ studentId: STUDENT_ID, score: 10, entered: true }],
    });
    expect(good.error).toBeUndefined();
  });
});

// ─── 33. Mark Engine — Core Calculations ─────────────────────────────────────

describe('33. Mark Engine — Core Calculations', () => {
  const engine = require('../services/markEngine');

  test('calculatePercentage: 40/50 = 80%', () => {
    expect(engine.calculatePercentage(40, 50)).toBe(80);
  });

  test('calculateAssessmentContribution: 40/50 with weight 20 = 16', () => {
    expect(engine.calculateAssessmentContribution(40, 50, 20)).toBe(16);
  });

  test('validateMark accepts 0 and maxMarks', () => {
    expect(engine.validateMark(0, 50).valid).toBe(true);
    expect(engine.validateMark(50, 50).valid).toBe(true);
  });

  test('validateMark rejects negative and above-max scores', () => {
    expect(engine.validateMark(-1, 50).valid).toBe(false);
    expect(engine.validateMark(51, 50).valid).toBe(false);
  });

  test('validateMark rejects non-numeric score and non-positive maxMarks', () => {
    expect(engine.validateMark('ten', 50).valid).toBe(false);
    expect(engine.validateMark(10, 0).valid).toBe(false);
  });

  test('normalizeMark keeps real zero as 0/entered', () => {
    expect(engine.normalizeMark(0, true)).toEqual({ score: 0, entered: true });
  });

  test('normalizeMark stores missing marks as null/not-entered (never 0)', () => {
    expect(engine.normalizeMark(null, false)).toEqual({ score: null, entered: false });
    expect(engine.normalizeMark(12, false)).toEqual({ score: null, entered: false });
  });

  test('normalizeMark rejects entered=true without a numeric score', () => {
    expect(() => engine.normalizeMark(null, true)).toThrow();
    expect(() => engine.normalizeMark('abc', true)).toThrow();
  });

  test('determineGrade boundaries', () => {
    expect(engine.determineGrade(85)).toBe('A');
    expect(engine.determineGrade(75)).toBe('B');
    expect(engine.determineGrade(65)).toBe('C');
    expect(engine.determineGrade(55)).toBe('D');
    expect(engine.determineGrade(10)).toBe('F');
  });

  test('calculateTermAverage averages subject totals with full precision', () => {
    expect(engine.calculateTermAverage([70, 80, 90])).toBe(80);
    // (1/3 + 2/3 + 1) / 3 = 2/3 — full float precision retained
    expect(engine.calculateTermAverage([1 / 3, 2 / 3, 1])).toBeCloseTo(2 / 3, 10);
    // Repeating floats keep full precision through the average
    expect(engine.calculateTermAverage([1 / 3, 1 / 3, 1 / 3])).toBeCloseTo(1 / 3, 10);
  });

  test('calculateSubjectAverage averages assessment percentages', () => {
    const items = [
      { assessment: { maxMarks: 50 }, mark: { score: 40, entered: true } }, // 80%
      { assessment: { maxMarks: 20 }, mark: { score: 10, entered: true } }, // 50%
    ];
    expect(engine.calculateSubjectAverage(items, 'ZERO')).toBe(65);
  });

  test('calculateClassStatistics treats real zero as entered and counts missing', () => {
    const stats = engine.calculateClassStatistics([
      { score: 0, entered: true },
      { score: null, entered: false },
      { score: 50, entered: true },
    ], 50);
    expect(stats.count).toBe(3);
    expect(stats.entered).toBe(2);
    expect(stats.missing).toBe(1);
    expect(stats.highest).toBe(50);
    expect(stats.lowest).toBe(0);
    expect(stats.average).toBe(25);
    expect(stats.passCount).toBe(1);
    expect(stats.passRate).toBe(50);
  });

  test('precision: intermediates stay unrounded, rounding only at display', () => {
    const items = [
      { assessment: { _id: 'a', maxMarks: 3, weight: 100 }, mark: { score: 1, entered: true } },
    ];
    const { total } = engine.calculateSubjectTotal(items, 'ZERO');
    // 1/3 * 100 = 33.3333... — must NOT be pre-rounded
    expect(total).not.toBe(33.33);
    expect(total).toBeCloseTo(100 / 3, 10);
    expect(engine.roundForDisplay(total)).toBe(33.33);
    expect(engine.roundForDisplay(total, 0)).toBe(33);
  });

  test('calculations are deterministic', () => {
    const items = [
      { assessment: { _id: 'a', maxMarks: 40, weight: 30 }, mark: { score: 31, entered: true } },
      { assessment: { _id: 'b', maxMarks: 60, weight: 70 }, mark: { score: 45, entered: true } },
    ];
    const first = engine.calculateSubjectTotal(items, 'ZERO');
    const second = engine.calculateSubjectTotal(items, 'ZERO');
    expect(first.total).toBe(second.total);
  });
});

// ─── 34. Mark Engine — Missing-Mark Policies & Weights ───────────────────────

describe('34. Mark Engine — Missing-Mark Policies & Weights', () => {
  const engine = require('../services/markEngine');

  const missing = { score: null, entered: false };
  const realZero = { score: 0, entered: true };

  test('real zero is never treated as missing', () => {
    expect(engine.resolveMissingMark(realZero, 'ZERO')).toBe(0);
    expect(engine.resolveMissingMark(realZero, 'PENDING')).toBe(0); // not null
  });

  test('ZERO policy: missing contributes 0', () => {
    expect(engine.resolveMissingMark(missing, 'ZERO')).toBe(0);
  });

  test('MINIMUM policy: missing contributes configured minimum', () => {
    expect(engine.resolveMissingMark(missing, 'MINIMUM')).toBe(engine.policyConfig.missingMinimum);
    expect(engine.resolveMissingMark(missing, 'MINIMUM')).toBe(0.1);
  });

  test('MINIMUM value is configuration-driven, not hardcoded elsewhere', () => {
    const original = engine.policyConfig.missingMinimum;
    try {
      engine.policyConfig.missingMinimum = 0.5;
      expect(engine.resolveMissingMark(missing, 'MINIMUM')).toBe(0.5);
      // Entered marks are unaffected by the missing-mark policy
      expect(engine.resolveMissingMark(realZero, 'MINIMUM')).toBe(0);
    } finally {
      engine.policyConfig.missingMinimum = original;
    }
  });

  test('PENDING policy: missing returns null and blocks completion', () => {
    expect(engine.resolveMissingMark(missing, 'PENDING')).toBeNull();
    const { isPending, total, assessmentResults } = engine.calculateSubjectTotal([
      { assessment: { _id: 'a', maxMarks: 50, weight: 50 }, mark: { score: 40, entered: true } },
      { assessment: { _id: 'b', maxMarks: 50, weight: 50 }, mark: missing },
    ], 'PENDING');
    expect(isPending).toBe(true);
    expect(assessmentResults[1].pending).toBe(true);
    expect(assessmentResults[1].contribution).toBeNull();
    expect(total).toBe(40); // completed assessment still contributes
  });

  test('subject total under ZERO policy counts missing as 0 contribution', () => {
    const { total, isPending, assessmentResults } = engine.calculateSubjectTotal([
      { assessment: { _id: 'a', maxMarks: 50, weight: 50 }, mark: { score: 50, entered: true } },
      { assessment: { _id: 'b', maxMarks: 50, weight: 50 }, mark: missing },
    ], 'ZERO');
    expect(isPending).toBe(false);
    expect(total).toBe(50);
    expect(assessmentResults[1].missing).toBe(true);
    expect(assessmentResults[1].contribution).toBe(0);
  });

  test('real zero contributes a real 0 (distinct from missing)', () => {
    const { assessmentResults } = engine.calculateSubjectTotal([
      { assessment: { _id: 'a', maxMarks: 50, weight: 50 }, mark: realZero },
    ], 'ZERO');
    expect(assessmentResults[0].missing).toBe(false);
    expect(assessmentResults[0].score).toBe(0);
    expect(assessmentResults[0].contribution).toBe(0);
  });

  test('weighted contribution example from spec: 40/50 @ weight 20 = 16', () => {
    const { total, assessmentResults } = engine.calculateSubjectTotal([
      { assessment: { _id: 'a', maxMarks: 50, weight: 20 }, mark: { score: 40, entered: true } },
    ], 'ZERO');
    expect(assessmentResults[0].percentage).toBe(80);
    expect(total).toBe(16);
  });

  test('validateAssessmentWeights accepts totals <= 100', () => {
    expect(engine.validateAssessmentWeights([{ weight: 40 }, { weight: 60 }]).valid).toBe(true);
    expect(engine.validateAssessmentWeights([]).valid).toBe(true);
    expect(engine.validateAssessmentWeights().valid).toBe(true);
  });

  test('validateAssessmentWeights rejects totals > 100 with a clear message', () => {
    const result = engine.validateAssessmentWeights([{ weight: 60 }, { weight: 50 }]);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('exceeds 100%');
    expect(result.total).toBe(110);
  });
});

// ─── 35. Assessment API — Role Authorization & CSRF ──────────────────────────

describe('35. Assessment API — Role Authorization & CSRF', () => {
  let app;
  beforeAll(() => { app = buildApp(); });

  test('unauthenticated GET /api/assessments returns 401', async () => {
    const res = await request(app).get('/api/assessments');
    expect(res.status).toBe(401);
  });

  test('unauthenticated POST /api/assessments returns 401', async () => {
    const res = await request(app).post('/api/assessments').send(validAssessmentBody);
    expect(res.status).toBe(401);
  });

  test('ADMIN can create an assessment (201)', async () => {
    mockValidScope();
    const Assessment = require('../models/Assessment');
    jest.spyOn(Assessment, 'create').mockResolvedValue(assessmentDoc());
    const res = await authPost(app, '/api/assessments', validAssessmentBody, 'ADMIN');
    expect(res.status).toBe(201);
    expect(res.body.assessment._id).toBe(ASSESSMENT_ID);
  });

  test('DOS can create an assessment (201)', async () => {
    mockValidScope();
    const Assessment = require('../models/Assessment');
    jest.spyOn(Assessment, 'create').mockResolvedValue(assessmentDoc());
    const res = await authPost(app, '/api/assessments', validAssessmentBody, 'DOS');
    expect(res.status).toBe(201);
  });

  test('TEACHER without an active assignment cannot create (403)', async () => {
    const TeacherAssignment = require('../models/TeacherAssignment');
    jest.spyOn(TeacherAssignment, 'findOne').mockResolvedValue(null);
    const res = await authPost(app, '/api/assessments', validAssessmentBody, 'TEACHER');
    expect(res.status).toBe(403);
  });

  test('TEACHER with a matching active assignment can create (201)', async () => {
    const TeacherAssignment = require('../models/TeacherAssignment');
    jest.spyOn(TeacherAssignment, 'findOne').mockResolvedValue({ _id: '64a000000000000000000030' });
    mockValidScope();
    const Assessment = require('../models/Assessment');
    jest.spyOn(Assessment, 'create').mockResolvedValue(assessmentDoc());
    const res = await authPost(app, '/api/assessments', validAssessmentBody, 'TEACHER');
    expect(res.status).toBe(201);
  });

  test('CLASS_TEACHER without a teaching assignment cannot create (403)', async () => {
    const TeacherAssignment = require('../models/TeacherAssignment');
    jest.spyOn(TeacherAssignment, 'findOne').mockResolvedValue(null);
    const res = await authPost(app, '/api/assessments', validAssessmentBody, 'CLASS_TEACHER');
    expect(res.status).toBe(403);
  });

  test('POST /api/assessments without CSRF returns 403', async () => {
    authService.getUserFromPayload.mockResolvedValue(makeUser({ role: 'ADMIN' }));
    const token = issueToken('ADMIN');
    const res = await request(app)
      .post('/api/assessments')
      .set('Cookie', makeAuthCookie(token))
      .send(validAssessmentBody);
    expect(res.status).toBe(403);
  });

  test('POST /api/assessments with invalid maxMarks returns 400', async () => {
    const res = await authPost(app, '/api/assessments', { ...validAssessmentBody, maxMarks: 0 }, 'ADMIN');
    expect(res.status).toBe(400);
  });

  test('invalid role cannot access assessments (403)', async () => {
    authService.getUserFromPayload.mockResolvedValue(makeUser({ role: 'STUDENT' }));
    const token = issueToken('STUDENT');
    const res = await request(app).get('/api/assessments').set('Cookie', makeAuthCookie(token));
    expect(res.status).toBe(403);
  });

  test('GET /api/assessments/:id with invalid ObjectId returns 400 without stack trace', async () => {
    const res = await authGet(app, '/api/assessments/not-an-objectid', 'ADMIN');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid ID format');
    expect(res.body.stack).toBeUndefined();
  });

  test('GET /api/assessments/meta exposes types and policies for the UI', async () => {
    const res = await authGet(app, '/api/assessments/meta', 'TEACHER');
    expect(res.status).toBe(200);
    expect(res.body.types).toContain('TEST');
    expect(res.body.types).toContain('EXAM');
    expect(res.body.statuses).toContain('DRAFT');
    expect(res.body.missingMarkPolicies).toEqual(['ZERO', 'MINIMUM', 'PENDING']);
  });
});

// ─── 36. Assessment — Academic Scope Validation ──────────────────────────────

describe('36. Assessment — Academic Scope Validation', () => {
  let app;
  const Assessment = require('../models/Assessment');
  const Term = require('../models/Term');
  const Class = require('../models/Class');
  const Subject = require('../models/Subject');
  const AcademicYear = require('../models/AcademicYear');

  beforeAll(() => { app = buildApp(); });

  const createAsAdmin = async (overrides = {}) =>
    authPost(app, '/api/assessments', { ...validAssessmentBody, ...overrides }, 'ADMIN');

  test('term from another academic year is rejected (400)', async () => {
    mockValidScope();
    jest.spyOn(Term, 'findById').mockResolvedValue({ _id: TERM_ID, school: SCHOOL_ID, academicYear: YEAR_ID_2 });
    const res = await createAsAdmin();
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Term does not belong');
  });

  test('class from another academic year is rejected (400)', async () => {
    mockValidScope();
    jest.spyOn(Class, 'findById').mockResolvedValue({ _id: CLASS_ID, school: SCHOOL_ID, academicYear: YEAR_ID_2 });
    const res = await createAsAdmin();
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Class does not belong');
  });

  test('subject from another school is rejected (400)', async () => {
    mockValidScope();
    jest.spyOn(Subject, 'findById').mockResolvedValue({ _id: SUBJECT_ID, school: SCHOOL_ID_2 });
    const res = await createAsAdmin();
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Subject not found');
  });

  test('academic year from another school is rejected (400)', async () => {
    mockValidScope();
    jest.spyOn(AcademicYear, 'findById').mockResolvedValue({ _id: YEAR_ID, school: SCHOOL_ID_2 });
    const res = await createAsAdmin();
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Academic year not found');
  });

  test('nonexistent class id is rejected (400)', async () => {
    mockValidScope();
    jest.spyOn(Class, 'findById').mockResolvedValue(null);
    const res = await createAsAdmin();
    expect(res.status).toBe(400);
  });

  test('dueDate before startDate is rejected (400)', async () => {
    mockValidScope();
    const Assessment2 = require('../models/Assessment');
    jest.spyOn(Assessment2, 'create').mockResolvedValue(assessmentDoc());
    const res = await createAsAdmin({ startDate: '2025-02-01', dueDate: '2025-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Due date');
  });

  test('combined weights exceeding 100% are rejected (400), never silently normalised', async () => {
    mockValidScope();
    jest.spyOn(Assessment, 'find').mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([{ weight: 90 }]) }),
    });
    const res = await createAsAdmin({ weight: 20 }); // 90 + 20 = 110
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid assessment weight configuration');
  });

  test('weight config within limits is accepted', async () => {
    mockValidScope();
    jest.spyOn(Assessment, 'find').mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([{ weight: 90 }]) }),
    });
    jest.spyOn(Assessment, 'create').mockResolvedValue(assessmentDoc({ weight: 10 }));
    const res = await createAsAdmin({ weight: 10 }); // 90 + 10 = 100
    expect(res.status).toBe(201);
  });

  test('request body school never overrides authenticated school', async () => {
    mockValidScope();
    let captured = null;
    jest.spyOn(Assessment, 'create').mockImplementation((doc) => { captured = doc; return Promise.resolve(assessmentDoc(doc)); });
    const res = await authPost(app, '/api/assessments', { ...validAssessmentBody, school: SCHOOL_ID_2 }, 'ADMIN');
    expect(res.status).toBe(201);
    expect(captured.school).toBe(SCHOOL_ID);
  });
});

// ─── 37. Assessment — Object-Level Authorization (IDOR) ──────────────────────

describe('37. Assessment — Object-Level Authorization (IDOR)', () => {
  let app;
  const Assessment = require('../models/Assessment');
  const TeacherAssignment = require('../models/TeacherAssignment');
  const ClassTeacherAssignment = require('../models/ClassTeacherAssignment');

  beforeAll(() => { app = buildApp(); });

  test('TEACHER cannot GET an assessment outside their assignment scope (403)', async () => {
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc()));
    jest.spyOn(TeacherAssignment, 'find').mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([{
        academicYear: YEAR_ID, term: TERM_ID, class: CLASS_ID_2, subject: SUBJECT_ID_2,
      }]) }),
    });
    jest.spyOn(ClassTeacherAssignment, 'find').mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([]) }),
    });
    const res = await authGet(app, `/api/assessments/${ASSESSMENT_ID}`, 'TEACHER');
    expect(res.status).toBe(403);
  });

  test('TEACHER can GET an assessment matching their exact assignment tuple (200)', async () => {
    const AcademicYear = require('../models/AcademicYear');
    const Term = require('../models/Term');
    const Class = require('../models/Class');
    const Subject = require('../models/Subject');
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc()));
    jest.spyOn(TeacherAssignment, 'find').mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([{
        academicYear: YEAR_ID, term: TERM_ID, class: CLASS_ID, subject: SUBJECT_ID,
      }]) }),
    });
    jest.spyOn(ClassTeacherAssignment, 'find').mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([]) }),
    });
    jest.spyOn(AcademicYear, 'findById').mockResolvedValue({ _id: YEAR_ID, school: SCHOOL_ID });
    jest.spyOn(Term, 'findById').mockResolvedValue({ _id: TERM_ID, school: SCHOOL_ID, academicYear: YEAR_ID });
    jest.spyOn(Class, 'findById').mockResolvedValue({ _id: CLASS_ID, school: SCHOOL_ID, academicYear: YEAR_ID });
    jest.spyOn(Subject, 'findById').mockResolvedValue({ _id: SUBJECT_ID, school: SCHOOL_ID });
    const res = await authGet(app, `/api/assessments/${ASSESSMENT_ID}`, 'TEACHER');
    expect(res.status).toBe(200);
  });

  test('no tuple-crossing: teacher with (Math,ClassA,T1)+(Eng,ClassB,T2) cannot see (Eng,ClassA,T1)', async () => {
    const AcademicYear = require('../models/AcademicYear');
    const Term = require('../models/Term');
    const Class = require('../models/Class');
    const Subject = require('../models/Subject');
    jest.spyOn(Assessment, 'find').mockReturnValue(populateChain([
      assessmentDoc({ _id: ASSESSMENT_ID, subject: SUBJECT_ID }),               // Math, ClassA, T1 — allowed
      assessmentDoc({ _id: MARK_ID, subject: SUBJECT_ID_2 }),                   // Eng, ClassA, T1 — crossed
      assessmentDoc({ _id: '64a000000000000000000031', class: CLASS_ID_2, subject: SUBJECT_ID_2, term: TERM_ID_2 }), // Eng, ClassB, T2 — allowed
    ]));
    jest.spyOn(TeacherAssignment, 'find').mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([
        { academicYear: YEAR_ID, term: TERM_ID, class: CLASS_ID, subject: SUBJECT_ID },
        { academicYear: YEAR_ID, term: TERM_ID_2, class: CLASS_ID_2, subject: SUBJECT_ID_2 },
      ]) }),
    });
    jest.spyOn(ClassTeacherAssignment, 'find').mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([]) }),
    });
    jest.spyOn(AcademicYear, 'findById').mockResolvedValue({ _id: YEAR_ID, school: SCHOOL_ID });
    jest.spyOn(Term, 'findById').mockResolvedValue({ _id: TERM_ID, school: SCHOOL_ID, academicYear: YEAR_ID });
    jest.spyOn(Class, 'findById').mockResolvedValue({ _id: CLASS_ID, school: SCHOOL_ID, academicYear: YEAR_ID });
    jest.spyOn(Subject, 'findById').mockResolvedValue({ _id: SUBJECT_ID, school: SCHOOL_ID });
    jest.spyOn(AcademicYear, 'find').mockResolvedValue([{ _id: YEAR_ID, school: SCHOOL_ID }]);
    jest.spyOn(Term, 'find').mockResolvedValue([
      { _id: TERM_ID, school: SCHOOL_ID, academicYear: YEAR_ID },
      { _id: TERM_ID_2, school: SCHOOL_ID, academicYear: YEAR_ID },
    ]);
    jest.spyOn(Class, 'find').mockResolvedValue([
      { _id: CLASS_ID, school: SCHOOL_ID, academicYear: YEAR_ID },
      { _id: CLASS_ID_2, school: SCHOOL_ID, academicYear: YEAR_ID },
    ]);
    jest.spyOn(Subject, 'find').mockResolvedValue([
      { _id: SUBJECT_ID, school: SCHOOL_ID },
      { _id: SUBJECT_ID_2, school: SCHOOL_ID },
    ]);
    const res = await authGet(app, '/api/assessments', 'TEACHER');
    expect(res.status).toBe(200);
    const ids = res.body.assessments.map((a) => a._id);
    expect(ids).toContain(ASSESSMENT_ID);
    expect(ids).toContain('64a000000000000000000031');
    expect(ids).not.toContain(MARK_ID); // tuple-crossing attempt must not leak
  });

  test('TEACHER cannot UPDATE an assessment outside their scope (403)', async () => {
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc()));
    jest.spyOn(TeacherAssignment, 'findOne').mockResolvedValue(null);
    const res = await authPut(app, `/api/assessments/${ASSESSMENT_ID}`, { name: 'Hacked' }, 'TEACHER');
    expect(res.status).toBe(403);
  });

  test('TEACHER cannot change class/term/year/subject via update body (mass assignment)', async () => {
    // The update schema strips academic scope fields entirely.
    const { updateAssessmentSchema } = require('../validators/assessmentValidators');
    const { value } = updateAssessmentSchema.validate({
      name: 'New name',
      academicYear: YEAR_ID_2, term: TERM_ID_2, class: CLASS_ID_2, subject: SUBJECT_ID_2,
      school: SCHOOL_ID_2,
    }, { stripUnknown: true });
    expect(value.academicYear).toBeUndefined();
    expect(value.term).toBeUndefined();
    expect(value.class).toBeUndefined();
    expect(value.subject).toBeUndefined();
    expect(value.school).toBeUndefined();
    expect(value.name).toBe('New name');
  });

  test('cross-school GET returns 403', async () => {
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc({ school: SCHOOL_ID_2 })));
    const res = await authGet(app, `/api/assessments/${ASSESSMENT_ID}`, 'ADMIN');
    expect(res.status).toBe(403);
  });

  test('cross-school UPDATE returns 403', async () => {
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc({ school: SCHOOL_ID_2 })));
    const res = await authPut(app, `/api/assessments/${ASSESSMENT_ID}`, { name: 'X' }, 'ADMIN');
    expect(res.status).toBe(403);
  });

  test('CLASS_TEACHER read scope comes from ClassTeacherAssignment', async () => {
    const AcademicYear = require('../models/AcademicYear');
    const Term = require('../models/Term');
    const Class = require('../models/Class');
    const Subject = require('../models/Subject');
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc()));
    jest.spyOn(TeacherAssignment, 'find').mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([]) }),
    });
    jest.spyOn(ClassTeacherAssignment, 'find').mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([{
        academicYear: YEAR_ID, term: TERM_ID, class: CLASS_ID,
      }]) }),
    });
    jest.spyOn(AcademicYear, 'findById').mockResolvedValue({ _id: YEAR_ID, school: SCHOOL_ID });
    jest.spyOn(Term, 'findById').mockResolvedValue({ _id: TERM_ID, school: SCHOOL_ID, academicYear: YEAR_ID });
    jest.spyOn(Class, 'findById').mockResolvedValue({ _id: CLASS_ID, school: SCHOOL_ID, academicYear: YEAR_ID });
    jest.spyOn(Subject, 'findById').mockResolvedValue({ _id: SUBJECT_ID, school: SCHOOL_ID });
    const res = await authGet(app, `/api/assessments/${ASSESSMENT_ID}`, 'CLASS_TEACHER');
    expect(res.status).toBe(200);
  });

  test('CLASS_TEACHER read scope does not grant UPDATE (403 without teaching assignment)', async () => {
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc()));
    jest.spyOn(TeacherAssignment, 'findOne').mockResolvedValue(null);
    const res = await authPut(app, `/api/assessments/${ASSESSMENT_ID}`, { name: 'Nope' }, 'CLASS_TEACHER');
    expect(res.status).toBe(403);
  });

  test('ADMIN update of a CLOSED assessment field is rejected (400)', async () => {
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc({ status: 'CLOSED' })));
    const res = await authPut(app, `/api/assessments/${ASSESSMENT_ID}`, { name: 'Frozen' }, 'ADMIN');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('closed or cancelled');
  });

  test('ADMIN can transition status of a CLOSED assessment and it is audited', async () => {
    const doc = assessmentDoc({ status: 'CLOSED', save: jest.fn().mockResolvedValue(true) });
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(doc));
    const res = await authPut(app, `/api/assessments/${ASSESSMENT_ID}`, { status: 'ACTIVE' }, 'ADMIN');
    expect(res.status).toBe(200);
    expect(doc.status).toBe('ACTIVE');
    const actions = AuditLog.create.mock.calls.map((c) => c[0].action);
    expect(actions).toContain('ASSESSMENT_STATUS_CHANGED');
  });
});

// ─── 38. Marks API — Validation & Zero vs Missing ────────────────────────────

describe('38. Marks API — Validation & Zero vs Missing', () => {
  let app;
  const Assessment = require('../models/Assessment');
  const Student = require('../models/Student');
  const Enrollment = require('../models/Enrollment');
  const AssessmentMark = require('../models/AssessmentMark');

  beforeAll(() => { app = buildApp(); });

  const mockMarkFlow = ({ existing = null, enrollment = { _id: '64a000000000000000000040' } } = {}) => {
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc()));
    jest.spyOn(Student, 'findById').mockResolvedValue({ _id: STUDENT_ID, school: SCHOOL_ID });
    jest.spyOn(Enrollment, 'findOne').mockResolvedValue(enrollment);
    jest.spyOn(AssessmentMark, 'findOne').mockResolvedValue(existing);
  };

  test('unauthenticated mark record returns 401', async () => {
    const res = await request(app).post('/api/assessment-marks').send({});
    expect(res.status).toBe(401);
  });

  test('valid mark is created (201) and MARK_CREATED is audited', async () => {
    mockMarkFlow();
    jest.spyOn(AssessmentMark, 'create').mockResolvedValue({ _id: MARK_ID, score: 42, entered: true });
    const res = await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 42, entered: true,
    }, 'ADMIN');
    expect(res.status).toBe(201);
    expect(res.body.mark.score).toBe(42);
    expect(res.body.created).toBe(true);
    const actions = AuditLog.create.mock.calls.map((c) => c[0].action);
    expect(actions).toContain('MARK_CREATED');
  });

  test('score of 0 is accepted and stored as a real zero', async () => {
    mockMarkFlow();
    let captured = null;
    jest.spyOn(AssessmentMark, 'create').mockImplementation((doc) => { captured = doc; return Promise.resolve({ _id: MARK_ID, ...doc }); });
    const res = await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 0, entered: true,
    }, 'ADMIN');
    expect(res.status).toBe(201);
    expect(captured.score).toBe(0);
    expect(captured.entered).toBe(true);
  });

  test('score equal to maxMarks is accepted', async () => {
    mockMarkFlow();
    jest.spyOn(AssessmentMark, 'create').mockResolvedValue({ _id: MARK_ID, score: 50, entered: true });
    const res = await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 50, entered: true,
    }, 'ADMIN');
    expect(res.status).toBe(201);
  });

  test('score above maxMarks is rejected (400)', async () => {
    mockMarkFlow();
    const res = await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 51, entered: true,
    }, 'ADMIN');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('exceeds maxMarks');
  });

  test('negative score is rejected (400)', async () => {
    mockMarkFlow();
    const res = await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: -5, entered: true,
    }, 'ADMIN');
    expect(res.status).toBe(400);
  });

  test('missing mark is preserved as null/not-entered (never stored as 0)', async () => {
    mockMarkFlow();
    let captured = null;
    jest.spyOn(AssessmentMark, 'create').mockImplementation((doc) => { captured = doc; return Promise.resolve({ _id: MARK_ID, ...doc }); });
    const res = await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: null, entered: false,
    }, 'ADMIN');
    expect(res.status).toBe(201);
    expect(captured.score).toBeNull();
    expect(captured.entered).toBe(false);
  });

  test('real zero and missing remain distinct states', async () => {
    mockMarkFlow();
    let zeroDoc = null;
    jest.spyOn(AssessmentMark, 'create').mockImplementation((doc) => { zeroDoc = doc; return Promise.resolve({ _id: MARK_ID, ...doc }); });
    await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 0, entered: true,
    }, 'ADMIN');
    const realZeroState = { ...zeroDoc };
    mockMarkFlow();
    let missingDoc = null;
    jest.spyOn(AssessmentMark, 'create').mockImplementation((doc) => { missingDoc = doc; return Promise.resolve({ _id: MARK_ID, ...doc }); });
    await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: null, entered: false,
    }, 'ADMIN');
    expect(realZeroState.score).toBe(0);
    expect(realZeroState.entered).toBe(true);
    expect(missingDoc.score).toBeNull();
    expect(missingDoc.entered).toBe(false);
  });

  test('invalid student id is rejected (400)', async () => {
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc()));
    jest.spyOn(Student, 'findById').mockResolvedValue(null);
    const res = await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 10, entered: true,
    }, 'ADMIN');
    expect(res.status).toBe(400);
  });

  test('unenrolled student is rejected (400)', async () => {
    mockMarkFlow({ enrollment: null });
    const res = await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 10, entered: true,
    }, 'ADMIN');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('not actively enrolled');
  });

  test('student from another school is rejected (400)', async () => {
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc()));
    jest.spyOn(Student, 'findById').mockResolvedValue({ _id: STUDENT_ID, school: SCHOOL_ID_2 });
    const res = await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 10, entered: true,
    }, 'ADMIN');
    expect(res.status).toBe(400);
  });

  test('marks cannot be recorded for a CANCELLED assessment (400)', async () => {
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc({ status: 'CANCELLED' })));
    const res = await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 10, entered: true,
    }, 'ADMIN');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('cancelled');
  });

  test('mark POST without CSRF returns 403', async () => {
    authService.getUserFromPayload.mockResolvedValue(makeUser({ role: 'ADMIN' }));
    const token = issueToken('ADMIN');
    const res = await request(app)
      .post('/api/assessment-marks')
      .set('Cookie', makeAuthCookie(token))
      .send({ assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 10, entered: true });
    expect(res.status).toBe(403);
  });

  test('GET /api/assessment-marks/:id with invalid ObjectId returns 400', async () => {
    const res = await authGet(app, '/api/assessment-marks/not-an-id', 'ADMIN');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid ID format');
  });
});

// ─── 39. Mark Corrections — History & Immutability ───────────────────────────

describe('39. Mark Corrections — History & Immutability', () => {
  let app;
  const Assessment = require('../models/Assessment');
  const Student = require('../models/Student');
  const Enrollment = require('../models/Enrollment');
  const AssessmentMark = require('../models/AssessmentMark');
  const MarkCorrection = require('../models/MarkCorrection');

  beforeAll(() => { app = buildApp(); });

  const mockCorrectionFlow = (existingDoc) => {
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc()));
    jest.spyOn(Student, 'findById').mockResolvedValue({ _id: STUDENT_ID, school: SCHOOL_ID });
    jest.spyOn(Enrollment, 'findOne').mockResolvedValue({ _id: '64a000000000000000000040' });
    jest.spyOn(AssessmentMark, 'findOne').mockResolvedValue(existingDoc);
  };

  test('first correction creates a history record with old/new values', async () => {
    const existing = {
      _id: MARK_ID, score: 42, entered: true, school: SCHOOL_ID,
      save: jest.fn().mockResolvedValue(true),
    };
    mockCorrectionFlow(existing);
    let correctionDoc = null;
    jest.spyOn(MarkCorrection, 'create').mockImplementation((doc) => { correctionDoc = doc; return Promise.resolve({ _id: '64a000000000000000000050', ...doc }); });
    const res = await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 45, entered: true, reason: 'Recount',
    }, 'ADMIN');
    expect(res.status).toBe(201);
    expect(res.body.corrected).toBe(true);
    expect(correctionDoc.oldScore).toBe(42);
    expect(correctionDoc.newScore).toBe(45);
    expect(correctionDoc.oldEntered).toBe(true);
    expect(correctionDoc.newEntered).toBe(true);
    expect(correctionDoc.reason).toBe('Recount');
    expect(correctionDoc.correctedBy).toBe(USER_ID);
    expect(correctionDoc.correctedAt).toBeInstanceOf(Date);
    expect(existing.save).toHaveBeenCalled();
    expect(existing.score).toBe(45); // current mark matches latest correction
  });

  test('second correction creates another separate history record', async () => {
    const existing = {
      _id: MARK_ID, score: 45, entered: true, school: SCHOOL_ID,
      save: jest.fn().mockResolvedValue(true),
    };
    mockCorrectionFlow(existing);
    const corrections = [];
    jest.spyOn(MarkCorrection, 'create').mockImplementation((doc) => { corrections.push(doc); return Promise.resolve({ _id: '64a000000000000000000051', ...doc }); });
    const res = await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 48, entered: true, reason: 'Second recount',
    }, 'ADMIN');
    expect(res.status).toBe(201);
    expect(corrections).toHaveLength(1);
    expect(corrections[0].oldScore).toBe(45);
    expect(corrections[0].newScore).toBe(48);
    const actions = AuditLog.create.mock.calls.map((c) => c[0].action);
    expect(actions).toContain('MARK_CORRECTED');
    expect(actions).toContain('MARK_UPDATED');
  });

  test('marking an existing mark as missing captures both states in history', async () => {
    const existing = {
      _id: MARK_ID, score: 30, entered: true, school: SCHOOL_ID,
      save: jest.fn().mockResolvedValue(true),
    };
    mockCorrectionFlow(existing);
    let correctionDoc = null;
    jest.spyOn(MarkCorrection, 'create').mockImplementation((doc) => { correctionDoc = doc; return Promise.resolve({ _id: '64a000000000000000000052', ...doc }); });
    const res = await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: null, entered: false, reason: 'Voided',
    }, 'ADMIN');
    expect(res.status).toBe(201);
    expect(correctionDoc.oldScore).toBe(30);
    expect(correctionDoc.newScore).toBeNull();
    expect(correctionDoc.oldEntered).toBe(true);
    expect(correctionDoc.newEntered).toBe(false);
    expect(existing.score).toBeNull();
    expect(existing.entered).toBe(false);
  });

  test('re-submitting an identical mark does not fabricate history', async () => {
    const existing = {
      _id: MARK_ID, score: 42, entered: true, school: SCHOOL_ID,
      save: jest.fn().mockResolvedValue(true),
    };
    mockCorrectionFlow(existing);
    const createSpy = jest.spyOn(MarkCorrection, 'create');
    const res = await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 42, entered: true,
    }, 'ADMIN');
    expect(res.status).toBe(201);
    expect(res.body.corrected).toBe(false);
    expect(createSpy).not.toHaveBeenCalled();
    expect(existing.save).not.toHaveBeenCalled();
  });

  test('correction history is immutable — updateOne is blocked at schema level', async () => {
    await expect(
      MarkCorrection.updateOne({ _id: MARK_ID }, { $set: { reason: 'tampered' } })
    ).rejects.toThrow(/immutable/i);
  });

  test('correction history is immutable — findOneAndUpdate is blocked', async () => {
    await expect(
      MarkCorrection.findOneAndUpdate({ _id: MARK_ID }, { $set: { newScore: 99 } })
    ).rejects.toThrow(/immutable/i);
  });

  test('correction history is immutable — deleteOne is blocked', async () => {
    await expect(
      MarkCorrection.deleteOne({ _id: MARK_ID })
    ).rejects.toThrow(/immutable/i);
  });

  test('correction history is immutable — persisted documents cannot be re-saved', async () => {
    const doc = new MarkCorrection({
      school: SCHOOL_ID, assessmentMark: MARK_ID, student: STUDENT_ID,
      assessment: ASSESSMENT_ID, oldScore: 1, newScore: 2,
      oldEntered: true, newEntered: true, correctedBy: USER_ID,
    });
    await doc.save(); // persist first: state.isNew → false
    await expect(doc.save()).rejects.toThrow(/immutable/i); // second save throws
  });

  test('history query returns corrections sorted by correctedAt desc', async () => {
    jest.spyOn(AssessmentMark, 'findById').mockReturnValue(populateChain({ _id: MARK_ID, school: SCHOOL_ID, assessment: { _id: ASSESSMENT_ID } }));
    const chain = { populate: jest.fn(), sort: jest.fn() };
    chain.populate.mockReturnValue(chain);
    chain.sort.mockResolvedValue([{ correctedAt: new Date() }]);
    jest.spyOn(MarkCorrection, 'find').mockReturnValue(chain);
    const res = await authGet(app, `/api/assessment-marks/${MARK_ID}/history`, 'ADMIN');
    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(1);
    expect(chain.sort).toHaveBeenCalledWith({ correctedAt: -1 });
  });
});

// ─── 40. Marks — Teacher Object-Level Authorization ──────────────────────────

describe('40. Marks — Teacher Object-Level Authorization', () => {
  let app;
  const Assessment = require('../models/Assessment');
  const AssessmentMark = require('../models/AssessmentMark');
  const TeacherAssignment = require('../models/TeacherAssignment');
  const ClassTeacherAssignment = require('../models/ClassTeacherAssignment');

  beforeAll(() => { app = buildApp(); });

  const scopeFindings = (teaching, classTeaching = []) => {
    jest.spyOn(TeacherAssignment, 'find').mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(teaching) }),
    });
    jest.spyOn(ClassTeacherAssignment, 'find').mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(classTeaching) }),
    });
  };

  test('TEACHER cannot record a mark on another teacher\'s assessment (403)', async () => {
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc()));
    jest.spyOn(TeacherAssignment, 'findOne').mockResolvedValue(null); // no matching assignment
    const res = await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 10, entered: true,
    }, 'TEACHER');
    expect(res.status).toBe(403);
  });

  test('TEACHER with matching assignment can record a mark (201)', async () => {
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc()));
    jest.spyOn(TeacherAssignment, 'findOne').mockResolvedValue({ _id: '64a000000000000000000030' });
    const Student = require('../models/Student');
    const Enrollment = require('../models/Enrollment');
    jest.spyOn(Student, 'findById').mockResolvedValue({ _id: STUDENT_ID, school: SCHOOL_ID });
    jest.spyOn(Enrollment, 'findOne').mockResolvedValue({ _id: '64a000000000000000000040' });
    jest.spyOn(AssessmentMark, 'findOne').mockResolvedValue(null);
    jest.spyOn(AssessmentMark, 'create').mockResolvedValue({ _id: MARK_ID, score: 10, entered: true });
    const res = await authPost(app, '/api/assessment-marks', {
      assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 10, entered: true,
    }, 'TEACHER');
    expect(res.status).toBe(201);
  });

  const swapCases = [
    ['subject', { subject: SUBJECT_ID_2 }],
    ['class', { class: CLASS_ID_2 }],
    ['term', { term: TERM_ID_2 }],
    ['academic year', { academicYear: YEAR_ID_2 }],
  ];
  swapCases.forEach(([label, overrides]) => {
    test(`TEACHER cannot record marks after swapping assessment ${label} (403)`, async () => {
      jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc(overrides)));
      jest.spyOn(TeacherAssignment, 'findOne').mockResolvedValue(null);
      const res = await authPost(app, '/api/assessment-marks', {
        assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 10, entered: true,
      }, 'TEACHER');
      expect(res.status).toBe(403);
    });
  });

  test('TEACHER cannot read marks for an out-of-scope assessment (403)', async () => {
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc()));
    scopeFindings([{ academicYear: YEAR_ID, term: TERM_ID, class: CLASS_ID_2, subject: SUBJECT_ID_2 }]);
    const res = await authGet(app, `/api/assessment-marks?assessment=${ASSESSMENT_ID}`, 'TEACHER');
    expect(res.status).toBe(403);
  });

  test('TEACHER can read marks for an in-scope assessment (200)', async () => {
    const AcademicYear = require('../models/AcademicYear');
    const Term = require('../models/Term');
    const Class = require('../models/Class');
    const Subject = require('../models/Subject');
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc()));
    scopeFindings([{ academicYear: YEAR_ID, term: TERM_ID, class: CLASS_ID, subject: SUBJECT_ID }]);
    jest.spyOn(AcademicYear, 'findById').mockResolvedValue({ _id: YEAR_ID, school: SCHOOL_ID });
    jest.spyOn(Term, 'findById').mockResolvedValue({ _id: TERM_ID, school: SCHOOL_ID, academicYear: YEAR_ID });
    jest.spyOn(Class, 'findById').mockResolvedValue({ _id: CLASS_ID, school: SCHOOL_ID, academicYear: YEAR_ID });
    jest.spyOn(Subject, 'findById').mockResolvedValue({ _id: SUBJECT_ID, school: SCHOOL_ID });
    const chain = { populate: jest.fn(), sort: jest.fn() };
    chain.populate.mockReturnValue(chain);
    chain.sort.mockResolvedValue([{ _id: MARK_ID, score: 10, entered: true }]);
    jest.spyOn(AssessmentMark, 'find').mockReturnValue(chain);
    const res = await authGet(app, `/api/assessment-marks?assessment=${ASSESSMENT_ID}`, 'TEACHER');
    expect(res.status).toBe(200);
    expect(res.body.marks).toHaveLength(1);
  });

  test('TEACHER reading mark history enforces the same scope (403 out of scope)', async () => {
    jest.spyOn(AssessmentMark, 'findById').mockReturnValue(populateChain({ _id: MARK_ID, school: SCHOOL_ID, assessment: { _id: ASSESSMENT_ID } }));
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc()));
    scopeFindings([{ academicYear: YEAR_ID, term: TERM_ID, class: CLASS_ID_2, subject: SUBJECT_ID_2 }]);
    const res = await authGet(app, `/api/assessment-marks/${MARK_ID}/history`, 'TEACHER');
    expect(res.status).toBe(403);
  });

  test('cross-school mark read returns 403', async () => {
    jest.spyOn(AssessmentMark, 'findById').mockReturnValue(populateChain({ _id: MARK_ID, school: SCHOOL_ID_2, assessment: { _id: ASSESSMENT_ID } }));
    const res = await authGet(app, `/api/assessment-marks/${MARK_ID}`, 'ADMIN');
    expect(res.status).toBe(403);
  });

  test('corrections listing endpoint rejects TEACHER (403)', async () => {
    const res = await authGet(app, `/api/mark-corrections/assessment/${ASSESSMENT_ID}`, 'TEACHER');
    expect(res.status).toBe(403);
  });
});

// ─── 41. Audit Logging & Security ────────────────────────────────────────────

describe('41. Audit Logging & Security', () => {
  let app;
  const Assessment = require('../models/Assessment');
  const TeacherAssignmentDummy = require('../models/TeacherAssignment');

  beforeAll(() => { app = buildApp(); });

  test('ASSESSMENT_CREATED audit is written with school and object ids', async () => {
    mockValidScope();
    jest.spyOn(Assessment, 'create').mockResolvedValue(assessmentDoc());
    await authPost(app, '/api/assessments', validAssessmentBody, 'ADMIN');
    const entry = AuditLog.create.mock.calls.map((c) => c[0]).find((c) => c.action === 'ASSESSMENT_CREATED');
    expect(entry).toBeDefined();
    expect(entry.entityType).toBe('Assessment');
    expect(entry.actorRole).toBe('ADMIN');
    expect(entry.metadata.class).toBe(CLASS_ID);
    expect(entry.metadata.subject).toBe(SUBJECT_ID);
  });

  test('ASSESSMENT_UPDATED audit is written on regular updates', async () => {
    const doc = assessmentDoc({ save: jest.fn().mockResolvedValue(true) });
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(doc));
    const res = await authPut(app, `/api/assessments/${ASSESSMENT_ID}`, { name: 'Renamed' }, 'ADMIN');
    expect(res.status).toBe(200);
    const entry = AuditLog.create.mock.calls.map((c) => c[0]).find((c) => c.action === 'ASSESSMENT_UPDATED');
    expect(entry).toBeDefined();
  });

  test('audit metadata never contains sensitive credentials', async () => {
    mockValidScope();
    jest.spyOn(Assessment, 'create').mockResolvedValue(assessmentDoc());
    await authPost(app, '/api/assessments', {
      ...validAssessmentBody,
      // malicious extra fields must never reach audit metadata
      password: 'supersecret', token: 'jwt-token', refreshToken: 'rt',
    }, 'ADMIN');
    for (const [entry] of AuditLog.create.mock.calls) {
      const flat = JSON.stringify(entry.metadata || {});
      expect(flat).not.toContain('supersecret');
      expect(flat).not.toContain('jwt-token');
      expect(flat).not.toContain('rt');
      if (entry.metadata) expect(entry.metadata).not.toHaveProperty('password');
    }
  });

  test('bulk mark recording reports per-student errors without failing the batch', async () => {
    jest.spyOn(Assessment, 'findById').mockReturnValue(populateChain(assessmentDoc()));
    jest.spyOn(TeacherAssignmentDummy, 'findOne').mockResolvedValue({ _id: '64a000000000000000000030' });
    const Student = require('../models/Student');
    const Enrollment = require('../models/Enrollment');
    const AssessmentMark = require('../models/AssessmentMark');
    jest.spyOn(Student, 'findById').mockImplementation((id) => Promise.resolve(id === STUDENT_ID ? { _id: id, school: SCHOOL_ID } : null));
    jest.spyOn(Enrollment, 'findOne').mockResolvedValue({ _id: '64a000000000000000000040' });
    jest.spyOn(AssessmentMark, 'findOne').mockResolvedValue(null);
    jest.spyOn(AssessmentMark, 'create').mockImplementation((doc) => Promise.resolve({ _id: MARK_ID, ...doc }));
    const res = await authPost(app, '/api/assessment-marks/bulk', {
      assessmentId: ASSESSMENT_ID,
      marks: [
        { studentId: STUDENT_ID, score: 30, entered: true },
        { studentId: TEACHER_2_ID, score: 30, entered: true }, // invalid student → error entry
      ],
    }, 'ADMIN');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].studentId).toBe(TEACHER_2_ID);
  });

  test('no extra roles exist: STUDENT/PARENT/ACCOUNTANT rejected on mark endpoints', async () => {
    for (const role of ['STUDENT', 'PARENT', 'ACCOUNTANT']) {
      const res = await authGet(app, '/api/assessment-marks', role);
      expect(res.status).toBe(403);
    }
  });
});
















