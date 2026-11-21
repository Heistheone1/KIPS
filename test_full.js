'use strict';

const http = require('http');

const BASE = { hostname: 'localhost', port: 5001 };

let authCookie = '';
let csrfSecretCookie = '';
let csrfToken = '';
let pass = 0, fail = 0;
let createdIds = {};

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

function parse(body) { try { return JSON.parse(body || '{}'); } catch { return {}; } }

async function main() {
  console.log('=== KIPS-SMS Comprehensive System Test ===\n');

  // ── 1. Health ─────────────────────────────────────────────────────
  console.log('[1] Health check');
  const h = await get('/health');
  ok('health returns 200', h.status === 200, h.status);

  // ── 2. Admin login ────────────────────────────────────────────────
  console.log('\n[2] Admin login');
  const login = await post('/api/auth/login', { email: 'admin@kipsschool.ac', password: 'KipsAdmin2024!' });
  ok('login returns 200', login.status === 200, login.status);
  const sc = login.headers['set-cookie'] || [];
  authCookie = sc.find(c => c.startsWith('kips_auth=')) || '';
  ok('auth cookie set', !!authCookie);

  const me = await get('/api/auth/me', authCookie);
  ok('me returns 200', me.status === 200, me.status);
  if (me.status === 200) {
    const u = parse(me.body).user;
    ok('me returns ADMIN user', u && u.role === 'ADMIN', u ? u.role : 'none');
  }

  // ── 3. CSRF token ─────────────────────────────────────────────────
  console.log('\n[3] CSRF token');
  const csrf = await get('/api/auth/csrf-token');
  ok('csrf-token returns 200', csrf.status === 200, csrf.status);
  if (csrf.status === 200) {
    const b = parse(csrf.body);
    csrfToken = b.csrfToken;
    const sc2 = csrf.headers['set-cookie'] || [];
    csrfSecretCookie = sc2.find(c => c.startsWith('kips_csrf_secret=')) || '';
    ok('csrf secret cookie set', !!csrfSecretCookie);
  }
  const writeCookie = [authCookie, csrfSecretCookie].filter(Boolean).join('; ');
  const writeHeaders = { 'x-csrf-token': csrfToken };

  // ── 4. Read endpoints ─────────────────────────────────────────────
  console.log('\n[4] Read endpoints');
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
    ['GET /api/assessments/meta', () => get('/api/assessments/meta', authCookie)],
  ];
  for (const [name, fn] of reads) {
    try {
      const r = await fn();
      ok(`${name} returns 200`, r.status === 200, r.status + ' ' + (r.body || '').slice(0, 80));
    } catch (e) { ok(`${name}`, false, 'error: ' + e.message); }
  }

  // ── 5. Write: Create school ───────────────────────────────────────
  console.log('\n[5] Write: Create school');
  const cs = await post('/api/schools', { name: 'Test School API', code: 'TSA', email: 'tsa@test.ac' }, writeCookie, writeHeaders);
  ok('create school returns 201', cs.status === 201, cs.status + ' ' + cs.body.slice(0, 100));
  if (cs.status === 201) createdIds.school = parse(cs.body).school?._id || parse(cs.body)._id || '';

  // ── 6. Write: Create academic year ────────────────────────────────
  console.log('\n[6] Write: Create academic year');
  const ca = await post('/api/academic-years', { name: '2026-2027 Test', code: '2026-TEST', status: 'ACTIVE' }, writeCookie, writeHeaders);
  ok('create academic year returns 201', ca.status === 201, ca.status + ' ' + ca.body.slice(0, 100));
  if (ca.status === 201) createdIds.year = parse(ca.body).academicYear?._id || parse(ca.body)._id || '';

  // ── 7. Write: Create term ─────────────────────────────────────────
  console.log('\n[7] Write: Create term');
  const ct = await post('/api/terms', { name: 'Term 1 Test', code: 'T1-TEST', sequence: 1, status: 'ACTIVE', academicYear: createdIds.year || '000000000000000000000001' }, writeCookie, writeHeaders);
  ok('create term returns 201', ct.status === 201, ct.status + ' ' + ct.body.slice(0, 100));
  if (ct.status === 201) createdIds.term = parse(ct.body).term?._id || parse(ct.body)._id || '';

  // ── 8. Write: Create class ────────────────────────────────────────
  console.log('\n[8] Write: Create class');
  const cc = await post('/api/classes', { name: 'P1 Test', code: 'P1-TEST', level: 'PRIMARY', status: 'ACTIVE', academicYear: createdIds.year || '000000000000000000000001' }, writeCookie, writeHeaders);
  ok('create class returns 201', cc.status === 201, cc.status + ' ' + cc.body.slice(0, 100));
  if (cc.status === 201) createdIds.class = parse(cc.body).class?._id || parse(cc.body)._id || '';

  // ── 9. Write: Create subject ──────────────────────────────────────
  console.log('\n[9] Write: Create subject');
  const csj = await post('/api/subjects', { name: 'Mathematics Test', code: 'MATH-TEST', status: 'ACTIVE' }, writeCookie, writeHeaders);
  ok('create subject returns 201', csj.status === 201, csj.status + ' ' + csj.body.slice(0, 100));
  if (csj.status === 201) createdIds.subject = parse(csj.body).subject?._id || parse(csj.body)._id || '';

  // ── 10. Write: Create student ─────────────────────────────────────
  console.log('\n[10] Write: Create student');
  const cst = await post('/api/students', { firstName: 'Test', lastName: 'Student', admissionNumber: 'TS-001', status: 'ACTIVE' }, writeCookie, writeHeaders);
  ok('create student returns 201', cst.status === 201, cst.status + ' ' + cst.body.slice(0, 100));
  if (cst.status === 201) createdIds.student = parse(cst.body).student?._id || parse(cst.body)._id || '';

  // ── 11. Write: Create enrollment ──────────────────────────────────
  console.log('\n[11] Write: Create enrollment');
  const ce = await post('/api/enrollments', { student: createdIds.student || '000000000000000000000001', class: createdIds.class || '000000000000000000000001', academicYear: createdIds.year || '000000000000000000000001', status: 'ACTIVE' }, writeCookie, writeHeaders);
  ok('create enrollment returns 201', ce.status === 201, ce.status + ' ' + ce.body.slice(0, 100));

  // ── 12. Assessment engine ─────────────────────────────────────────
  console.log('\n[12] Assessment engine');
  const ca2 = await post('/api/assessments', { name: 'Test Exam', type: 'EXAM', maxMarks: 100, weight: 50, status: 'ACTIVE', class: createdIds.class || '000000000000000000000001', subject: createdIds.subject || '000000000000000000000001', term: createdIds.term || '000000000000000000000001', academicYear: createdIds.year || '000000000000000000000001' }, writeCookie, writeHeaders);
  ok('create assessment returns 201', ca2.status === 201, ca2.status + ' ' + ca2.body.slice(0, 100));
  if (ca2.status === 201) createdIds.assessment = parse(ca2.body).assessment?._id || parse(ca2.body)._id || '';

  // Record a mark
  if (createdIds.assessment && createdIds.student) {
    const rm = await post('/api/assessment-marks', { assessment: createdIds.assessment, student: createdIds.student, score: 85, entered: true }, writeCookie, writeHeaders);
    ok('record mark returns 201', rm.status === 201, rm.status + ' ' + rm.body.slice(0, 100));
    if (rm.status === 201) createdIds.mark = parse(rm.body).mark?._id || parse(rm.body)._id || '';
  }

  // Bulk record marks
  if (createdIds.assessment && createdIds.student) {
    const bm = await post('/api/assessment-marks/bulk', { assessment: createdIds.assessment, marks: [{ student: createdIds.student, score: 90, entered: true }] }, writeCookie, writeHeaders);
    ok('bulk record marks returns 201', bm.status === 201, bm.status + ' ' + bm.body.slice(0, 100));
  }

  // Get mark history
  if (createdIds.mark) {
    const mh = await get(`/api/assessment-marks/${createdIds.mark}/history`, authCookie);
    ok('mark history returns 200', mh.status === 200, mh.status);
  }

  // ── 13. Result engine ─────────────────────────────────────────────
  console.log('\n[13] Result engine');
  const rm2 = await post('/api/results/subject/generate', { academicYear: createdIds.year || '000000000000000000000001', term: createdIds.term || '000000000000000000000001', class: createdIds.class || '000000000000000000000001', subject: createdIds.subject || '000000000000000000000001' }, writeCookie, writeHeaders);
  ok('generate subject result returns 200/201', [200, 201].includes(rm2.status), rm2.status + ' ' + rm2.body.slice(0, 100));

  const rt = await post('/api/results/term/generate', { academicYear: createdIds.year || '000000000000000000000001', term: createdIds.term || '000000000000000000000001', class: createdIds.class || '000000000000000000000001' }, writeCookie, writeHeaders);
  ok('generate term result returns 200/201', [200, 201].includes(rt.status), rt.status + ' ' + rt.body.slice(0, 100));

  const rs = await get('/api/results/status?academicYear=' + (createdIds.year || '000000000000000000000001') + '&term=' + (createdIds.term || '000000000000000000000001'), authCookie);
  ok('results status returns 200', rs.status === 200, rs.status);

  // ── 14. Report engine ─────────────────────────────────────────────
  console.log('\n[14] Report engine');
  const rg = await post('/api/reports/generate', { academicYear: createdIds.year || '000000000000000000000001', term: createdIds.term || '000000000000000000000001', class: createdIds.class || '000000000000000000000001' }, writeCookie, writeHeaders);
  ok('generate report returns 201/200', [200, 201].includes(rg.status), rg.status + ' ' + rg.body.slice(0, 100));
  if (rg.status === 201) createdIds.report = parse(rg.body).report?._id || parse(rg.body)._id || '';

  // ── 15. CSRF protection (without token) ───────────────────────────
  console.log('\n[15] CSRF protection');
  const nocsrf = await post('/api/schools', { name: 'No CSRF', code: 'NCS', email: 'ncs@test.ac' }, authCookie);
  ok('POST without CSRF returns 403', nocsrf.status === 403, nocsrf.status);

  // ── 16. Logout ────────────────────────────────────────────────────
  console.log('\n[16] Logout');
  const lg = await post('/api/auth/logout', {}, writeCookie, writeHeaders);
  ok('logout returns 200', lg.status === 200, lg.status);
  const sc3 = lg.headers['set-cookie'] || [];
  const cleared = sc3.find(c => c.startsWith('kips_auth='));
  ok('logout clears auth cookie', !!cleared && (cleared.includes('Max-Age=0') || cleared.includes('expires=Thu, 01 Jan 1970')), cleared ? 'cleared' : 'not found');

  console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
