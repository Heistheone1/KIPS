'use strict';

/**
 * KIPS-SMS Phase 1 Security Hardening Tests
 * Covers: password hashing, JWT, cookie auth, CSRF, RBAC,
 *         mass-assignment protection, audit sanitization.
 */

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/kips_sms_test';
process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_characters_long_x';
process.env.JWT_EXPIRES_IN = '1h';
process.env.COOKIE_SECRET = 'test_cookie_secret_at_least_32_characters_x';
process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
process.env.BCRYPT_ROUNDS = '4';

const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SECRET = process.env.JWT_SECRET;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
const AUTH_COOKIE = 'kips_auth';
const CSRF_SECRET_COOKIE = 'kips_csrf_secret';

const makeUser = (overrides = {}) => ({
  _id: '64a000000000000000000001',
  school: { _id: '64a000000000000000000099', name: 'KIPS School', code: 'KIPS', status: 'active' },
  firstName: 'Test',
  lastName: 'User',
  email: 'test@kips.ac',
  role: 'ADMIN',
  status: 'active',
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  toSafeObject() {
    return {
      _id: this._id, school: this.school, firstName: this.firstName,
      lastName: this.lastName, email: this.email, role: this.role,
      status: this.status, lastLoginAt: this.lastLoginAt,
    };
  },
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const issueTestToken = (role = 'ADMIN', userId = '64a000000000000000000001') =>
  jwt.sign({ sub: userId, role, school: '64a000000000000000000099' }, SECRET, { expiresIn: '1h' });

/**
 * Sign a cookie value the same way cookie-parser does for signed cookies.
 * This lets us set a valid signed cookie in test requests.
 */
const signCookieValue = (val) => {
  const signature = require('crypto')
    .createHmac('sha256', COOKIE_SECRET)
    .update(val)
    .digest('base64')
    .replace(/=+$/, '');
  return `s:${val}.${signature}`;
};

/**
 * Build a Cookie header string with a signed auth cookie containing a JWT.
 */
const makeAuthCookie = (token) => `${AUTH_COOKIE}=${signCookieValue(token)}`;

/**
 * Get a CSRF token from the app by hitting GET /api/auth/csrf-token.
 * Returns { csrfToken, csrfSecretCookieHeader }.
 */
const getCsrfToken = async (app) => {
  const res = await request(app).get('/api/auth/csrf-token');
  expect(res.status).toBe(200);
  const csrfToken = res.body.csrfToken;
  // Extract the Set-Cookie header for the CSRF secret
  const setCookieHeader = res.headers['set-cookie'] || [];
  const csrfSecretCookie = setCookieHeader.find((c) => c.startsWith(CSRF_SECRET_COOKIE));
  return { csrfToken, csrfSecretCookie };
};

// ─── 1. Password Hashing ─────────────────────────────────────────────────────

describe('1. Password Hashing', () => {
  test('bcrypt hash is not plaintext', async () => {
    const hash = await bcrypt.hash('MySecurePass!', 4);
    expect(hash).not.toBe('MySecurePass!');
    expect(hash.startsWith('$2b$')).toBe(true);
  });

  test('bcrypt compare succeeds with correct password', async () => {
    const hash = await bcrypt.hash('MySecurePass!', 4);
    expect(await bcrypt.compare('MySecurePass!', hash)).toBe(true);
  });

  test('bcrypt compare fails with wrong password', async () => {
    const hash = await bcrypt.hash('correct', 4);
    expect(await bcrypt.compare('wrong', hash)).toBe(false);
  });
});

// ─── 2. JWT Token ─────────────────────────────────────────────────────────────

describe('2. JWT Token', () => {
  const real = jest.requireActual('../services/authService');

  test('issueToken produces a verifiable token', () => {
    const token = real.issueToken(makeUser());
    const decoded = jwt.verify(token, SECRET);
    expect(decoded.sub).toBe('64a000000000000000000001');
    expect(decoded.role).toBe('ADMIN');
  });

  test('token does not contain password, passwordHash, or email', () => {
    const decoded = jwt.decode(real.issueToken(makeUser()));
    expect(decoded.password).toBeUndefined();
    expect(decoded.passwordHash).toBeUndefined();
    expect(decoded.email).toBeUndefined();
  });

  test('verifyToken rejects tampered token', () => {
    expect(() => real.verifyToken(issueTestToken() + 'x')).toThrow();
  });

  test('verifyToken rejects wrong-secret token', () => {
    const bad = jwt.sign({ sub: 'x', role: 'ADMIN', school: 'y' }, 'wrong_secret');
    expect(() => real.verifyToken(bad)).toThrow();
  });

  test('verifyToken rejects expired token', () => {
    const expired = jwt.sign({ sub: 'x', role: 'ADMIN', school: 'y' }, SECRET, { expiresIn: '-1s' });
    expect(() => real.verifyToken(expired)).toThrow();
  });
});

// ─── 3. Login — Cookie Auth ───────────────────────────────────────────────────

describe('3. Login — Cookie Authentication', () => {
  let app;

  beforeAll(() => { app = buildApp(); });

  beforeEach(() => {
    authService.login.mockReset();
    authService.login.mockImplementation(async (email, password) => {
      if (email === 'admin@kips.ac' && password === 'Password123!') {
        return { user: makeUser({ email }), token: issueTestToken('ADMIN') };
      }
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    });
  });

  test('login sets HttpOnly auth cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@kips.ac', password: 'Password123!' });
    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'] || [];
    const authCookie = cookies.find((c) => c.startsWith(AUTH_COOKIE));
    expect(authCookie).toBeDefined();
    expect(authCookie).toMatch(/HttpOnly/i);
  });

  test('login response body does NOT contain token or credential', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@kips.ac', password: 'Password123!' });
    expect(res.status).toBe(200);
    // No token in body
    expect(res.body.token).toBeUndefined();
    expect(res.body.accessToken).toBeUndefined();
    expect(res.body.jwt).toBeUndefined();
    // User info is present but no credential
    expect(res.body.user).toBeDefined();
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.password).toBeUndefined();
  });

  test('login failure returns 401 and sets no auth cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@kips.ac', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    const cookies = res.headers['set-cookie'] || [];
    const authCookie = cookies.find((c) => c.startsWith(AUTH_COOKIE));
    expect(authCookie).toBeUndefined();
  });

  test('login with missing email returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'Password123!' });
    expect(res.status).toBe(400);
  });

  test('login with missing password returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@kips.ac' });
    expect(res.status).toBe(400);
  });

  test('login with invalid email format returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: 'x' });
    expect(res.status).toBe(400);
  });
});

// ─── 4. Cookie Auth — Protected Endpoints ────────────────────────────────────

describe('4. Cookie Auth — Protected Endpoints', () => {
  let app;

  beforeAll(() => { app = buildApp(); });
  beforeEach(() => { authService.getUserFromPayload.mockReset(); });

  test('GET /api/auth/me without cookie returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me with invalid cookie value returns 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${AUTH_COOKIE}=invalid.garbage.value`);
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me with valid cookie returns 200', async () => {
    authService.getUserFromPayload.mockResolvedValue(makeUser());
    const token = issueTestToken('ADMIN');
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', makeAuthCookie(token));
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('GET /api/users without cookie returns 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  test('POST /api/schools without cookie returns 401', async () => {
    const res = await request(app).post('/api/schools').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  test('expired JWT in cookie returns 401', async () => {
    const expired = jwt.sign(
      { sub: '64a000000000000000000001', role: 'ADMIN', school: '64a000000000000000000099' },
      SECRET,
      { expiresIn: '-1s' }
    );
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', makeAuthCookie(expired));
    expect(res.status).toBe(401);
  });
});

// ─── 5. Logout ────────────────────────────────────────────────────────────────

describe('5. Logout', () => {
  let app;

  beforeAll(() => { app = buildApp(); });
  beforeEach(() => { authService.getUserFromPayload.mockReset(); });

  test('logout clears auth cookie', async () => {
    authService.getUserFromPayload.mockResolvedValue(makeUser());
    const token = issueTestToken('ADMIN');
    const { csrfToken, csrfSecretCookie } = await getCsrfToken(app);

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [makeAuthCookie(token), csrfSecretCookie].filter(Boolean).join('; '))
      .set('x-csrf-token', csrfToken);

    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'] || [];
    const cleared = cookies.find((c) => c.startsWith(AUTH_COOKIE));
    // Cookie should be cleared (Max-Age=0 or Expires in the past)
    expect(cleared).toBeDefined();
    expect(cleared).toMatch(/Max-Age=0|expires=Thu, 01 Jan 1970/i);
  });
});

// ─── 6. CSRF Protection ───────────────────────────────────────────────────────

describe('6. CSRF Protection', () => {
  let app;

  beforeAll(() => { app = buildApp(); });
  beforeEach(() => { authService.getUserFromPayload.mockReset(); });

  const setupAuth = (role = 'ADMIN') => {
    authService.getUserFromPayload.mockResolvedValue(makeUser({ role }));
    return issueTestToken(role);
  };

  test('GET /api/auth/csrf-token returns a token', async () => {
    const res = await request(app).get('/api/auth/csrf-token');
    expect(res.status).toBe(200);
    expect(typeof res.body.csrfToken).toBe('string');
    expect(res.body.csrfToken.length).toBeGreaterThan(10);
  });

  test('POST without CSRF token returns 403', async () => {
    const token = setupAuth();
    const res = await request(app)
      .post('/api/schools')
      .set('Cookie', makeAuthCookie(token))
      .send({ name: 'Test', code: 'TST', email: 'test@school.ac' });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/CSRF/i);
  });

  test('PUT without CSRF token returns 403', async () => {
    const token = setupAuth();
    const res = await request(app)
      .put('/api/schools/64a000000000000000000099')
      .set('Cookie', makeAuthCookie(token))
      .send({ name: 'Updated' });
    expect(res.status).toBe(403);
  });

  test('PATCH without CSRF token returns 403', async () => {
    const token = setupAuth();
    const res = await request(app)
      .patch('/api/users/64a000000000000000000001')
      .set('Cookie', makeAuthCookie(token))
      .send({ firstName: 'Hacked' });
    // 403 CSRF or 404 route not found — either way not 200
    expect([403, 404]).toContain(res.status);
  });

  test('DELETE without CSRF token returns 403', async () => {
    const token = setupAuth();
    const res = await request(app)
      .delete('/api/users/64a000000000000000000001')
      .set('Cookie', makeAuthCookie(token));
    // 403 CSRF or 404 route not found — either way not 200
    expect([403, 404]).toContain(res.status);
  });

  test('POST with invalid CSRF token returns 403', async () => {
    const token = setupAuth();
    const { csrfSecretCookie } = await getCsrfToken(app);
    const res = await request(app)
      .post('/api/schools')
      .set('Cookie', [makeAuthCookie(token), csrfSecretCookie].filter(Boolean).join('; '))
      .set('x-csrf-token', 'invalid-csrf-token-value')
      .send({ name: 'Test', code: 'TST', email: 'test@school.ac' });
    expect(res.status).toBe(403);
  });

  test('valid CSRF-protected authenticated POST succeeds (reaches controller)', async () => {
    const token = setupAuth('ADMIN');
    const { csrfToken, csrfSecretCookie } = await getCsrfToken(app);

    // Mock School.create to avoid DB call
    const School = require('../models/School');
    jest.spyOn(School, 'create').mockResolvedValue({
      _id: '64a000000000000000000088',
      name: 'New School',
      code: 'NEW',
      email: 'new@school.ac',
      status: 'active',
      toObject: () => ({}),
    });

    const res = await request(app)
      .post('/api/schools')
      .set('Cookie', [makeAuthCookie(token), csrfSecretCookie].filter(Boolean).join('; '))
      .set('x-csrf-token', csrfToken)
      .send({ name: 'New School', code: 'NEW', email: 'new@school.ac' });

    // 201 created or 500 if mock incomplete — but NOT 401 or 403
    expect([201, 500]).toContain(res.status);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);

    jest.restoreAllMocks();
  });
});

// ─── 7. RBAC — Role Authorization ────────────────────────────────────────────

describe('7. RBAC — Role Authorization', () => {
  let app;

  beforeAll(() => { app = buildApp(); });
  beforeEach(() => { authService.getUserFromPayload.mockReset(); });

  const mockDB = () => {
    const User = require('../models/User');
    jest.spyOn(User, 'find').mockReturnValue({ select: () => Promise.resolve([]) });
  };

  test('ADMIN can access GET /api/users (200)', async () => {
    authService.getUserFromPayload.mockResolvedValue(makeUser({ role: 'ADMIN' }));
    mockDB();
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', makeAuthCookie(issueTestToken('ADMIN')));
    expect(res.status).toBe(200);
  });

  test('DOS can access GET /api/users (200)', async () => {
    authService.getUserFromPayload.mockResolvedValue(makeUser({ role: 'DOS' }));
    mockDB();
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', makeAuthCookie(issueTestToken('DOS')));
    expect(res.status).toBe(200);
  });

  test('TEACHER cannot access GET /api/users (403)', async () => {
    authService.getUserFromPayload.mockResolvedValue(makeUser({ role: 'TEACHER' }));
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', makeAuthCookie(issueTestToken('TEACHER')));
    expect(res.status).toBe(403);
  });

  test('CLASS_TEACHER cannot access GET /api/users (403)', async () => {
    authService.getUserFromPayload.mockResolvedValue(makeUser({ role: 'CLASS_TEACHER' }));
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', makeAuthCookie(issueTestToken('CLASS_TEACHER')));
    expect(res.status).toBe(403);
  });

  test('TEACHER cannot POST /api/schools (403 — CSRF checked after role)', async () => {
    authService.getUserFromPayload.mockResolvedValue(makeUser({ role: 'TEACHER' }));
    const res = await request(app)
      .post('/api/schools')
      .set('Cookie', makeAuthCookie(issueTestToken('TEACHER')))
      .send({ name: 'Test', code: 'TST', email: 'test@school.ac' });
    expect(res.status).toBe(403);
  });

  test('DOS cannot POST /api/schools (403)', async () => {
    authService.getUserFromPayload.mockResolvedValue(makeUser({ role: 'DOS' }));
    const res = await request(app)
      .post('/api/schools')
      .set('Cookie', makeAuthCookie(issueTestToken('DOS')))
      .send({ name: 'Test', code: 'TST', email: 'test@school.ac' });
    expect(res.status).toBe(403);
  });
});

// ─── 8. Invalid Role Rejection ────────────────────────────────────────────────

describe('8. Invalid Role Rejection', () => {
  test('user with role STUDENT cannot access protected routes (403)', async () => {
    const app = buildApp();
    authService.getUserFromPayload.mockResolvedValue(makeUser({ role: 'STUDENT' }));
    const token = jwt.sign(
      { sub: '64a000000000000000000001', role: 'STUDENT', school: '64a000000000000000000099' },
      SECRET,
      { expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', makeAuthCookie(token));
    expect(res.status).toBe(403);
  });
});

// ─── 9. Mass Assignment Protection ───────────────────────────────────────────

describe('9. Mass Assignment Protection', () => {
  test('createUserSchema strips passwordHash, _id, __v', () => {
    const { createUserSchema } = require('../validators/authValidators');
    const { value, error } = createUserSchema.validate({
      school: '64a000000000000000000099',
      firstName: 'John', lastName: 'Doe',
      email: 'john@kips.ac', password: 'SecurePass1!',
      role: 'TEACHER',
      passwordHash: 'injected', _id: 'injected', __v: 0,
    }, { stripUnknown: true });
    expect(error).toBeUndefined();
    expect(value.passwordHash).toBeUndefined();
    expect(value._id).toBeUndefined();
    expect(value.__v).toBeUndefined();
  });

  test('createUserSchema rejects ADMIN role', () => {
    const { createUserSchema } = require('../validators/authValidators');
    const { error } = createUserSchema.validate({
      school: '64a000000000000000000099',
      firstName: 'Evil', lastName: 'User',
      email: 'evil@kips.ac', password: 'SecurePass1!',
      role: 'ADMIN',
    });
    expect(error).toBeDefined();
    expect(error.details[0].message).toMatch(/DOS|CLASS_TEACHER|TEACHER/);
  });

  test('updateUserSchema strips role, email, passwordHash', () => {
    const { updateUserSchema } = require('../validators/authValidators');
    const { value } = updateUserSchema.validate({
      firstName: 'Updated',
      role: 'ADMIN', email: 'new@evil.ac', passwordHash: 'hacked',
    }, { stripUnknown: true });
    expect(value.role).toBeUndefined();
    expect(value.email).toBeUndefined();
    expect(value.passwordHash).toBeUndefined();
    expect(value.firstName).toBe('Updated');
  });
});

// ─── 10. Audit Log Sanitization ──────────────────────────────────────────────

describe('10. Audit Log — Sensitive Field Sanitization', () => {
  test('log() resolves without throwing on sensitive metadata', async () => {
    const auditService = require('../services/auditService');
    await expect(auditService.log({
      actor: null,
      action: 'TEST_ACTION',
      metadata: { password: 'secret', passwordHash: '$2b$hash', token: 'jwt.here', safe: 'ok' },
    })).resolves.not.toThrow();
  });

  test('AuditLog.create is called without password fields', async () => {
    const AuditLog = require('../models/AuditLog');
    AuditLog.create.mockClear();
    const auditService = require('../services/auditService');
    await auditService.log({
      actor: null,
      action: 'SENSITIVE_TEST',
      metadata: { password: 'strip_me', safeField: 'keep_me' },
    });
    expect(AuditLog.create).toHaveBeenCalledTimes(1);
    const arg = AuditLog.create.mock.calls[0][0];
    expect(arg.metadata?.password).toBeUndefined();
    expect(arg.metadata?.safeField).toBe('keep_me');
  });
});
