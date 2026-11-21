'use strict';

const http = require('http');
const crypto = require('crypto');

const BASE = { hostname: 'localhost', port: 5001 };

let authCookie = '';
let csrfSecretCookie = '';
let csrfToken = '';
let pass = 0, fail = 0;

function req(method, path, body, cookie = '', headers = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const opts = {
      ...BASE, path, method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'Cookie': cookie,
        ...headers,
      },
    };
    const r = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() });
      });
    });
    r.on('error', reject);
    if (bodyStr) r.write(bodyStr);
    r.end();
  });
}

function get(path, cookie = '') { return req('GET', path, null, cookie); }
function post(path, body, cookie = '', headers = {}) { return req('POST', path, body, cookie, headers); }
function put(path, body, cookie = '', headers = {}) { return req('PUT', path, body, cookie, headers); }
function del(path, cookie = '', headers = {}) { return req('DELETE', path, null, cookie, headers); }

function ok(label, cond, extra = '') {
  if (cond) { pass++; console.log(`  PASS: ${label}`); }
  else { fail++; console.log(`  FAIL: ${label} ${extra}`); }
}

async function main() {
  console.log('=== KIPS-SMS Comprehensive API Test ===\n');

  // 1. Health
  console.log('[1] Health check');
  const h = await get('/health');
  ok('health returns 200', h.status === 200, h.status);

  // 2. Login as admin
  console.log('\n[2] Admin login');
  const login = await post('/api/auth/login', { email: 'admin@kipsschool.ac', password: 'KipsAdmin2024!' });
  ok('login returns 200', login.status === 200, login.status);
  console.log('  Login body:', login.body);
  const sc = login.headers['set-cookie'] || [];
  authCookie = sc.find(c => c.startsWith('kips_auth=')) || '';
  ok('auth cookie set', !!authCookie);

  // 3. GET /me
  console.log('\n[3] GET /api/auth/me');
  const me = await get('/api/auth/me', authCookie);
  ok('me returns 200', me.status === 200, me.status);
  if (me.status === 200) {
    const u = JSON.parse(me.body);
    ok('me returns user object', !!u.user);
    ok('me role is ADMIN', u.user && u.user.role === 'ADMIN', u.user && u.user.role);
  }

  // 4. CSRF token
  console.log('\n[4] CSRF token');
  const csrf = await get('/api/auth/csrf-token');
  ok('csrf-token returns 200', csrf.status === 200, csrf.status);
  if (csrf.status === 200) {
    const b = JSON.parse(csrf.body);
    csrfToken = b.csrfToken;
    const sc2 = csrf.headers['set-cookie'] || [];
    csrfSecretCookie = sc2.find(c => c.startsWith('kips_csrf_secret=')) || '';
    ok('csrf secret cookie set', !!csrfSecretCookie);
    ok('csrf token string', typeof csrfToken === 'string' && csrfToken.length > 10);
  }

  const writeCookie = [authCookie, csrfSecretCookie].filter(Boolean).join('; ');
  const writeHeaders = { 'x-csrf-token': csrfToken };

  // 5. List entities (read tests)
  console.log('\n[5] Read endpoints (all roles)');
  const reads = [
    ['GET /api/users', () => get('/api/users', authCookie)],
    ['GET /api/schools', () => get('/api/schools', authCookie)],
    ['GET /api/academic-years', () => get('/api/academic-years', authCookie)],
    ['GET /api/terms', () => get('/api/terms', authCookie)],
    ['GET /api/classes', () => get('/api/classes', authCookie)],
    ['GET /api/students', () => get('/api/students', authCookie)],
    ['GET /api/enrollments', () => get('/api/enrollments', authCookie)],
    ['GET /api/subjects', () => get('/api/subjects', authCookie)],
    ['GET /api/teacher-assignments', () => get('/api/teacher-assignments', authCookie)],
    ['GET /api/class-teacher-assignments', () => get('/api/class-teacher-assignments', authCookie)],
    ['GET /api/assessments', () => get('/api/assessments', authCookie)],
    ['GET /api/assessment-marks', () => get('/api/assessment-marks', authCookie)],
    ['GET /api/results/meta', () => get('/api/results/meta', authCookie)],
    ['GET /api/results/grading-scale', () => get('/api/results/grading-scale', authCookie)],
    ['GET /api/reports', () => get('/api/reports', authCookie)],
  ];
  for (const [name, fn] of reads) {
    try {
      const r = await fn();
      ok(`${name} returns 200`, r.status === 200, r.status + ' body:' + (r.body || '').slice(0, 100));
    } catch (e) { ok(`${name}`, false, 'error: ' + e.message); }
  }

  // 6. CREATE school
  console.log('\n[6] Create school (ADMIN)');
  const schoolBody = { name: 'Test School', code: 'TEST', email: 'test@school.ac' };
  const cs = await post('/api/schools', schoolBody, writeCookie, writeHeaders);
  ok('create school returns 201', cs.status === 201, cs.status + ' ' + cs.body);
  let schoolId = '';
  if (cs.status === 201) { try { schoolId = JSON.parse(cs.body).school?._id || JSON.parse(cs.body)._id || ''; } catch {} }

  // 7. UPDATE school
  if (schoolId) {
    console.log('\n[7] Update school (ADMIN)');
    const us = await put(`/api/schools/${schoolId}`, { name: 'Test School Updated' }, writeCookie, writeHeaders);
    ok('update school returns 200', us.status === 200, us.status);
  }

  // 8. RBAC - TEACHER cannot POST /api/schools
  console.log('\n[8] RBAC (would need teacher user - skipped, need teacher account)');

  // 9. Assessment meta
  console.log('\n[9] Assessment meta');
  const am = await get('/api/assessments/meta', authCookie);
  ok('assessment meta returns 200', am.status === 200, am.status);

  // 10. Result meta
  console.log('\n[10] Result meta');
  const rm = await get('/api/results/meta', authCookie);
  ok('result meta returns 200', rm.status === 200, rm.status);

  console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
