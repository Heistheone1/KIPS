'use strict';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/kips_sms_test_p2';
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

jest.mock('../models/AuditLog', () => ({
  create: jest.fn().mockResolvedValue({}),
  index: jest.fn(),
}));

const authService = require('../services/authService');
const { buildApp } = require('./testApp');

const SECRET = process.env.JWT_SECRET;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
const AUTH_COOKIE = 'kips_auth';
const CSRF_SECRET_COOKIE = 'kips_csrf_secret';

const SCHOOL_ID = '64a000000000000000000099';
const SCHOOL_ID_2 = '64a000000000000000000088';
const USER_ID = '64a000000000000000000001';
const YEAR_ID = '64a000000000000000000010';
const TERM_ID = '64a000000000000000000011';
const CLASS_ID = '64a000000000000000000012';
const STUDENT_ID = '64a000000000000000000013';
const SUBJECT_ID = '64a000000000000000000014';
const TEACHER_ID = '64a000000000000000000015';
const ENROLLMENT_ID = '64a000000000000000000016';

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
    .update(val).digest('base64').replace(/=+$/, '');
  return `s:${val}.${sig}`;
};

const makeAuthCookie = (token) => `${AUTH_COOKIE}=${signCookieValue(token)}`;

const getCsrf = async (app) => {
  const res = await request(app).get('/api/auth/csrf-token');
  const csrfToken = res.body.csrfToken;
  const csrfSecretCookie = (res.headers['set-cookie'] || [])
    .find((c) => c.startsWith(CSRF_SECRET_COOKIE));
  return { csrfToken, csrfSecretCookie };
};

const authPost = async (app, url, body, role = 'ADMIN') => {
  authService.getUserFromPayload.mockResolvedValue(makeUser({ role }));
  const token = issueToken(role);
  const { csrfToken, csrfSecretCookie } = await getCsrf(app);
  return request(app)
    .post(url)
    .set('Cookie', [makeAuthCookie(token), csrfSecretCookie].filter(Boolean).join('; '))
    .set('x-csrf-token', csrfToken)
    .send(body);
};

const authGet = async (app, url, role = 'ADMIN') => {
  authService.getUserFromPayload.mockResolvedValue(makeUser({ role }));
  const token = issueToken(role);
  return request(app)
    .get(url)
    .set('Cookie', makeAuthCookie(token));
};

const authPut = async (app, url, body, role = 'ADMIN') => {
  authService.getUserFromPayload.mockResolvedValue(makeUser({ role }));
  const token = issueToken(role);
  const { csrfToken, csrfSecretCookie } = await getCsrf(app);
  return request(app)
    .put(url)
    .set('Cookie', [makeAuthCookie(token), csrfSecretCookie].filter(Boolean).join('; '))
    .set('x-csrf-token', csrfToken)
    .send(body);
};

// ─── Validator Tests ──────────────────────────────────────────────────────────

describe('11. Academic Year Validator', () => {
  const { createAcademicYearSchema, updateAcademicYearSchema } = require('../validators/academicValidators');
  const { validate } = require('../validators/authValidators');

  test('valid academic year passes', () => {
    const { error } = createAcademicYearSchema.validate({
      name: '2025-2026', code: 'AY2526',
      startDate: '2025-01-01', endDate: '2025-12-31',
    });
    expect(error).toBeUndefined();
  });

  test('endDate before startDate fails', () => {
    const { error } = createAcademicYearSchema.validate({
      name: '2025-2026', code: 'AY2526',
      startDate: '2025-12-31', endDate: '2025-01-01',
    });
    expect(error).toBeDefined();
    expect(error.details[0].message).toMatch(/after start date/i);
  });

  test('missing name fails', () => {
    const { error } = createAcademicYearSchema.validate({
      code: 'AY2526', startDate: '2025-01-01', endDate: '2025-12-31',
    });
    expect(error).toBeDefined();
  });

  test('invalid status fails', () => {
    const { error } = createAcademicYearSchema.validate({
      name: '2025-2026', code: 'AY2526',
      startDate: '2025-01-01', endDate: '2025-12-31',
      status: 'INVALID',
    });
    expect(error).toBeDefined();
  });

  test('updateAcademicYearSchema strips unknown fields', () => {
    const { value } = updateAcademicYearSchema.validate(
      { name: 'Updated', school: 'injected', createdBy: 'injected' },
      { stripUnknown: true }
    );
    expect(value.school).toBeUndefined();
    expect(value.createdBy).toBeUndefined();
    expect(value.name).toBe('Updated');
  });
});

describe('12. Term Validator', () => {
  const { createTermSchema } = require('../validators/academicValidators');

  test('valid term passes', () => {
    const { error } = createTermSchema.validate({
      academicYear: YEAR_ID,
      name: 'Term 1', code: 'T1', sequence: 1,
      startDate: '2025-01-01', endDate: '2025-04-30',
    });
    expect(error).toBeUndefined();
  });

  test('missing sequence fails', () => {
    const { error } = createTermSchema.validate({
      academicYear: YEAR_ID,
      name: 'Term 1', code: 'T1',
      startDate: '2025-01-01', endDate: '2025-04-30',
    });
    expect(error).toBeDefined();
  });

  test('invalid academicYear ObjectId fails', () => {
    const { error } = createTermSchema.validate({
      academicYear: 'not-an-id',
      name: 'Term 1', code: 'T1', sequence: 1,
      startDate: '2025-01-01', endDate: '2025-04-30',
    });
    expect(error).toBeDefined();
  });
});

describe('13. Class Validator', () => {
  const { createClassSchema } = require('../validators/academicValidators');

  test('valid class passes', () => {
    const { error } = createClassSchema.validate({
      academicYear: YEAR_ID, name: 'P1 A', code: 'P1A',
    });
    expect(error).toBeUndefined();
  });

  test('missing academicYear fails', () => {
    const { error } = createClassSchema.validate({ name: 'P1 A', code: 'P1A' });
    expect(error).toBeDefined();
  });
});

describe('14. Student Validator', () => {
  const { createStudentSchema, updateStudentSchema } = require('../validators/academicValidators');

  test('valid student passes', () => {
    const { error } = createStudentSchema.validate({
      admissionNumber: 'ADM001', firstName: 'John', lastName: 'Doe',
    });
    expect(error).toBeUndefined();
  });

  test('missing admissionNumber fails', () => {
    const { error } = createStudentSchema.validate({ firstName: 'John', lastName: 'Doe' });
    expect(error).toBeDefined();
  });

  test('updateStudentSchema strips school and admissionNumber', () => {
    const { value } = updateStudentSchema.validate(
      { firstName: 'Jane', school: 'injected', admissionNumber: 'hacked' },
      { stripUnknown: true }
    );
    expect(value.school).toBeUndefined();
    expect(value.admissionNumber).toBeUndefined();
    expect(value.firstName).toBe('Jane');
  });

  test('invalid gender fails', () => {
    const { error } = createStudentSchema.validate({
      admissionNumber: 'ADM001', firstName: 'John', lastName: 'Doe', gender: 'UNKNOWN',
    });
    expect(error).toBeDefined();
  });
});

describe('15. Enrollment Validator', () => {
  const { createEnrollmentSchema } = require('../validators/academicValidators');

  test('valid enrollment passes', () => {
    const { error } = createEnrollmentSchema.validate({
      student: STUDENT_ID, academicYear: YEAR_ID, class: CLASS_ID,
    });
    expect(error).toBeUndefined();
  });

  test('invalid ObjectId for student fails', () => {
    const { error } = createEnrollmentSchema.validate({
      student: 'bad-id', academicYear: YEAR_ID, class: CLASS_ID,
    });
    expect(error).toBeDefined();
  });
});

describe('16. Subject Validator', () => {
  const { createSubjectSchema } = require('../validators/academicValidators');

  test('valid subject passes', () => {
    const { error } = createSubjectSchema.validate({ name: 'Mathematics', code: 'MATH' });
    expect(error).toBeUndefined();
  });

  test('missing code fails', () => {
    const { error } = createSubjectSchema.validate({ name: 'Mathematics' });
    expect(error).toBeDefined();
  });
});

describe('17. Teacher Assignment Validator', () => {
  const { createTeacherAssignmentSchema } = require('../validators/academicValidators');

  test('valid assignment passes', () => {
    const { error } = createTeacherAssignmentSchema.validate({
      teacher: TEACHER_ID, academicYear: YEAR_ID,
      term: TERM_ID, class: CLASS_ID, subject: SUBJECT_ID,
    });
    expect(error).toBeUndefined();
  });

  test('missing subject fails', () => {
    const { error } = createTeacherAssignmentSchema.validate({
      teacher: TEACHER_ID, academicYear: YEAR_ID, term: TERM_ID, class: CLASS_ID,
    });
    expect(error).toBeDefined();
  });
});

describe('18. Class Teacher Assignment Validator', () => {
  const { createClassTeacherAssignmentSchema } = require('../validators/academicValidators');

  test('valid assignment passes', () => {
    const { error } = createClassTeacherAssignmentSchema.validate({
      teacher: TEACHER_ID, academicYear: YEAR_ID, term: TERM_ID, class: CLASS_ID,
    });
    expect(error).toBeUndefined();
  });

  test('missing term fails', () => {
    const { error } = createClassTeacherAssignmentSchema.validate({
      teacher: TEACHER_ID, academicYear: YEAR_ID, class: CLASS_ID,
    });
    expect(error).toBeDefined();
  });
});

// ─── API Authorization Tests ──────────────────────────────────────────────────

describe('19. Academic Year API — Authorization', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  beforeEach(() => { authService.getUserFromPayload.mockReset(); });

  test('unauthenticated GET /api/academic-years returns 401', async () => {
    const res = await request(app).get('/api/academic-years');
    expect(res.status).toBe(401);
  });

  test('TEACHER can GET /api/academic-years (read-only)', async () => {
    const AcademicYear = require('../models/AcademicYear');
    jest.spyOn(AcademicYear, 'find').mockReturnValue({ sort: () => Promise.resolve([]) });
    const res = await authGet(app, '/api/academic-years', 'TEACHER');
    expect(res.status).toBe(200);
    jest.restoreAllMocks();
  });

  test('TEACHER cannot POST /api/academic-years (403)', async () => {
    const res = await authPost(app, '/api/academic-years', {
      name: '2025-2026', code: 'AY2526',
      startDate: '2025-01-01', endDate: '2025-12-31',
    }, 'TEACHER');
    expect(res.status).toBe(403);
  });

  test('CLASS_TEACHER cannot POST /api/academic-years (403)', async () => {
    const res = await authPost(app, '/api/academic-years', {
      name: '2025-2026', code: 'AY2526',
      startDate: '2025-01-01', endDate: '2025-12-31',
    }, 'CLASS_TEACHER');
    expect(res.status).toBe(403);
  });

  test('DOS can POST /api/academic-years', async () => {
    const AcademicYear = require('../models/AcademicYear');
    jest.spyOn(AcademicYear, 'findOne').mockResolvedValue(null);
    jest.spyOn(AcademicYear, 'create').mockResolvedValue({
      _id: YEAR_ID, name: '2025-2026', code: 'AY2526',
      school: SCHOOL_ID, status: 'PLANNED',
    });
    const res = await authPost(app, '/api/academic-years', {
      name: '2025-2026', code: 'AY2526',
      startDate: '2025-01-01', endDate: '2025-12-31',
    }, 'DOS');
    expect([201, 500]).toContain(res.status);
    expect(res.status).not.toBe(403);
    jest.restoreAllMocks();
  });

  test('POST /api/academic-years without CSRF returns 403', async () => {
    authService.getUserFromPayload.mockResolvedValue(makeUser({ role: 'ADMIN' }));
    const token = issueToken('ADMIN');
    const res = await request(app)
      .post('/api/academic-years')
      .set('Cookie', makeAuthCookie(token))
      .send({ name: '2025-2026', code: 'AY2526', startDate: '2025-01-01', endDate: '2025-12-31' });
    expect(res.status).toBe(403);
  });

  test('POST /api/academic-years with endDate before startDate returns 400', async () => {
    const res = await authPost(app, '/api/academic-years', {
      name: '2025-2026', code: 'AY2526',
      startDate: '2025-12-31', endDate: '2025-01-01',
    }, 'ADMIN');
    expect(res.status).toBe(400);
  });
});

describe('20. Term API — Authorization', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  beforeEach(() => { authService.getUserFromPayload.mockReset(); });

  test('unauthenticated GET /api/terms returns 401', async () => {
    const res = await request(app).get('/api/terms');
    expect(res.status).toBe(401);
  });

  test('TEACHER cannot POST /api/terms (403)', async () => {
    const res = await authPost(app, '/api/terms', {
      academicYear: YEAR_ID, name: 'Term 1', code: 'T1', sequence: 1,
      startDate: '2025-01-01', endDate: '2025-04-30',
    }, 'TEACHER');
    expect(res.status).toBe(403);
  });

  test('POST /api/terms with invalid ObjectId returns 400', async () => {
    const res = await authPost(app, '/api/terms', {
      academicYear: 'not-valid', name: 'Term 1', code: 'T1', sequence: 1,
      startDate: '2025-01-01', endDate: '2025-04-30',
    }, 'ADMIN');
    expect(res.status).toBe(400);
  });
});

describe('21. Class API — Authorization', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  beforeEach(() => { authService.getUserFromPayload.mockReset(); });

  test('unauthenticated GET /api/classes returns 401', async () => {
    const res = await request(app).get('/api/classes');
    expect(res.status).toBe(401);
  });

  test('TEACHER cannot POST /api/classes (403)', async () => {
    const res = await authPost(app, '/api/classes', {
      academicYear: YEAR_ID, name: 'P1 A', code: 'P1A',
    }, 'TEACHER');
    expect(res.status).toBe(403);
  });

  test('POST /api/classes with missing academicYear returns 400', async () => {
    const res = await authPost(app, '/api/classes', { name: 'P1 A', code: 'P1A' }, 'ADMIN');
    expect(res.status).toBe(400);
  });
});

describe('22. Student API — Authorization', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  beforeEach(() => { authService.getUserFromPayload.mockReset(); });

  test('unauthenticated GET /api/students returns 401', async () => {
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(401);
  });

  test('TEACHER cannot POST /api/students (403)', async () => {
    const res = await authPost(app, '/api/students', {
      admissionNumber: 'ADM001', firstName: 'John', lastName: 'Doe',
    }, 'TEACHER');
    expect(res.status).toBe(403);
  });

  test('CLASS_TEACHER cannot POST /api/students (403)', async () => {
    const res = await authPost(app, '/api/students', {
      admissionNumber: 'ADM001', firstName: 'John', lastName: 'Doe',
    }, 'CLASS_TEACHER');
    expect(res.status).toBe(403);
  });

  test('POST /api/students with missing admissionNumber returns 400', async () => {
    const res = await authPost(app, '/api/students', {
      firstName: 'John', lastName: 'Doe',
    }, 'ADMIN');
    expect(res.status).toBe(400);
  });

  test('Student has no login endpoint', async () => {
    const res = await request(app).post('/api/auth/student-login').send({});
    // Route does not exist — returns 404 (no auth) or 401 (auth middleware on parent router)
    expect([401, 404]).toContain(res.status);
  });
});

describe('23. Enrollment API — Authorization', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  beforeEach(() => { authService.getUserFromPayload.mockReset(); });

  test('unauthenticated GET /api/enrollments returns 401', async () => {
    const res = await request(app).get('/api/enrollments');
    expect(res.status).toBe(401);
  });

  test('TEACHER cannot POST /api/enrollments (403)', async () => {
    const res = await authPost(app, '/api/enrollments', {
      student: STUDENT_ID, academicYear: YEAR_ID, class: CLASS_ID,
    }, 'TEACHER');
    expect(res.status).toBe(403);
  });

  test('POST /api/enrollments with invalid student ObjectId returns 400', async () => {
    const res = await authPost(app, '/api/enrollments', {
      student: 'bad', academicYear: YEAR_ID, class: CLASS_ID,
    }, 'ADMIN');
    expect(res.status).toBe(400);
  });
});

describe('24. Subject API — Authorization', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  beforeEach(() => { authService.getUserFromPayload.mockReset(); });

  test('unauthenticated GET /api/subjects returns 401', async () => {
    const res = await request(app).get('/api/subjects');
    expect(res.status).toBe(401);
  });

  test('TEACHER cannot POST /api/subjects (403)', async () => {
    const res = await authPost(app, '/api/subjects', {
      name: 'Mathematics', code: 'MATH',
    }, 'TEACHER');
    expect(res.status).toBe(403);
  });

  test('POST /api/subjects with missing code returns 400', async () => {
    const res = await authPost(app, '/api/subjects', { name: 'Mathematics' }, 'ADMIN');
    expect(res.status).toBe(400);
  });
});

describe('25. Teacher Assignment API — Authorization', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  beforeEach(() => { authService.getUserFromPayload.mockReset(); });

  test('unauthenticated GET /api/teacher-assignments returns 401', async () => {
    const res = await request(app).get('/api/teacher-assignments');
    expect(res.status).toBe(401);
  });

  test('TEACHER cannot POST /api/teacher-assignments (403)', async () => {
    const res = await authPost(app, '/api/teacher-assignments', {
      teacher: TEACHER_ID, academicYear: YEAR_ID,
      term: TERM_ID, class: CLASS_ID, subject: SUBJECT_ID,
    }, 'TEACHER');
    expect(res.status).toBe(403);
  });

  test('POST /api/teacher-assignments with missing subject returns 400', async () => {
    const res = await authPost(app, '/api/teacher-assignments', {
      teacher: TEACHER_ID, academicYear: YEAR_ID, term: TERM_ID, class: CLASS_ID,
    }, 'ADMIN');
    expect(res.status).toBe(400);
  });
});

describe('26. Class Teacher Assignment API — Authorization', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  beforeEach(() => { authService.getUserFromPayload.mockReset(); });

  test('unauthenticated GET /api/class-teacher-assignments returns 401', async () => {
    const res = await request(app).get('/api/class-teacher-assignments');
    expect(res.status).toBe(401);
  });

  test('TEACHER cannot POST /api/class-teacher-assignments (403)', async () => {
    const res = await authPost(app, '/api/class-teacher-assignments', {
      teacher: TEACHER_ID, academicYear: YEAR_ID, term: TERM_ID, class: CLASS_ID,
    }, 'TEACHER');
    expect(res.status).toBe(403);
  });
});

describe('27. IDOR / Cross-School Protection', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  beforeEach(() => { authService.getUserFromPayload.mockReset(); });

  test('GET /api/academic-years/:id for non-existent id returns 404', async () => {
    const AcademicYear = require('../models/AcademicYear');
    jest.spyOn(AcademicYear, 'findById').mockResolvedValue(null);
    const res = await authGet(app, `/api/academic-years/${YEAR_ID}`, 'ADMIN');
    expect(res.status).toBe(404);
    jest.restoreAllMocks();
  });

  test('GET /api/students/:id for wrong school returns 403', async () => {
    const Student = require('../models/Student');
    jest.spyOn(Student, 'findById').mockResolvedValue({
      _id: STUDENT_ID,
      school: { toString: () => SCHOOL_ID_2 },
      firstName: 'Other', lastName: 'School',
    });
    const res = await authGet(app, `/api/students/${STUDENT_ID}`, 'ADMIN');
    expect(res.status).toBe(403);
    jest.restoreAllMocks();
  });

  test('GET /api/classes/:id for wrong school returns 403', async () => {
    const Class = require('../models/Class');
    jest.spyOn(Class, 'findById').mockReturnValue({
      populate: () => Promise.resolve({
        _id: CLASS_ID,
        school: { toString: () => SCHOOL_ID_2 },
        name: 'P1 A',
      }),
    });
    const res = await authGet(app, `/api/classes/${CLASS_ID}`, 'ADMIN');
    expect(res.status).toBe(403);
    jest.restoreAllMocks();
  });

  test('GET /api/schools/:id for wrong school returns 404 (cross-school IDOR)', async () => {
    const School = require('../models/School');
    jest.spyOn(School, 'findById').mockResolvedValue({
      _id: SCHOOL_ID_2,
      name: 'Other School',
      code: 'OTH',
      email: 'other@school.ac',
      toString: () => SCHOOL_ID_2,
    });
    const res = await authGet(app, `/api/schools/${SCHOOL_ID_2}`, 'ADMIN');
    expect(res.status).toBe(404);
    expect(res.body.school).toBeUndefined();
    jest.restoreAllMocks();
  });

  test('GET /api/schools/:id for own school returns 200', async () => {
    const School = require('../models/School');
    jest.spyOn(School, 'findById').mockResolvedValue({
      _id: SCHOOL_ID,
      name: 'KIPS School',
      code: 'KIPS',
      email: 'kips@school.ac',
      toString: () => SCHOOL_ID,
    });
    const res = await authGet(app, `/api/schools/${SCHOOL_ID}`, 'ADMIN');
    expect(res.status).toBe(200);
    expect(res.body.school.code).toBe('KIPS');
    jest.restoreAllMocks();
  });

  test('student without gender saves (gender is optional, defaults to null)', async () => {
    const Student = require('../models/Student');
    const student = new Student({
      school: SCHOOL_ID, admissionNumber: 'ADM-NG', firstName: 'No', lastName: 'Gender', createdBy: USER_ID,
    });
    // Defaults applied by constructor: gender defaults to null
    expect(student.gender).toBeNull();
    jest.restoreAllMocks();
  });

  test('invalid ObjectId format returns 400', async () => {
    const res = await authGet(app, '/api/academic-years/not-an-objectid', 'ADMIN');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid ID format');
    expect(res.body.stack).toBeUndefined();
    expect(res.body.error).toBeUndefined();
  });
});

describe('28. Mass Assignment Protection — Academic', () => {
  test('createAcademicYearSchema strips school, createdBy, _id', () => {
    const { createAcademicYearSchema } = require('../validators/academicValidators');
    const { value } = createAcademicYearSchema.validate({
      name: '2025-2026', code: 'AY2526',
      startDate: '2025-01-01', endDate: '2025-12-31',
      school: 'injected', createdBy: 'injected', _id: 'injected',
    }, { stripUnknown: true });
    expect(value.school).toBeUndefined();
    expect(value.createdBy).toBeUndefined();
    expect(value._id).toBeUndefined();
  });

  test('createStudentSchema strips school, createdBy', () => {
    const { createStudentSchema } = require('../validators/academicValidators');
    const { value } = createStudentSchema.validate({
      admissionNumber: 'ADM001', firstName: 'John', lastName: 'Doe',
      school: 'injected', createdBy: 'injected',
    }, { stripUnknown: true });
    expect(value.school).toBeUndefined();
    expect(value.createdBy).toBeUndefined();
  });

  test('createEnrollmentSchema strips school, createdBy', () => {
    const { createEnrollmentSchema } = require('../validators/academicValidators');
    const { value } = createEnrollmentSchema.validate({
      student: STUDENT_ID, academicYear: YEAR_ID, class: CLASS_ID,
      school: 'injected', createdBy: 'injected',
    }, { stripUnknown: true });
    expect(value.school).toBeUndefined();
    expect(value.createdBy).toBeUndefined();
  });
});

describe('29. CSRF on Academic Mutations', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  beforeEach(() => { authService.getUserFromPayload.mockReset(); });

  const mutationEndpoints = [
    '/api/academic-years',
    '/api/terms',
    '/api/classes',
    '/api/students',
    '/api/enrollments',
    '/api/subjects',
    '/api/teacher-assignments',
    '/api/class-teacher-assignments',
  ];

  mutationEndpoints.forEach((endpoint) => {
    test(`POST ${endpoint} without CSRF returns 403`, async () => {
      authService.getUserFromPayload.mockResolvedValue(makeUser({ role: 'ADMIN' }));
      const token = issueToken('ADMIN');
      const res = await request(app)
        .post(endpoint)
        .set('Cookie', makeAuthCookie(token))
        .send({});
      expect(res.status).toBe(403);
    });
  });
});

describe('30. Role Boundary — No Unauthorized Roles', () => {
  let app;
  beforeAll(() => { app = buildApp(); });
  beforeEach(() => { authService.getUserFromPayload.mockReset(); });

  const invalidRoles = ['STUDENT', 'PARENT', 'ACCOUNTANT', 'FINANCE', 'SECRETARY'];

  invalidRoles.forEach((role) => {
    test(`${role} cannot access /api/academic-years (403)`, async () => {
      authService.getUserFromPayload.mockResolvedValue(makeUser({ role }));
      const token = jwt.sign({ sub: USER_ID, role, school: SCHOOL_ID }, SECRET, { expiresIn: '1h' });
      const res = await request(app)
        .get('/api/academic-years')
        .set('Cookie', makeAuthCookie(token));
      expect(res.status).toBe(403);
    });
  });
});
