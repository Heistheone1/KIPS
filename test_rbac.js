'use strict';

const http = require('http');
const BASE = { hostname: 'localhost', port: 5001 };

let pass = 0, fail = 0;

function req(method, path, body, cookie = '', headers = {}) {
  return new Promise((resolve, reject) => {
    const bs = body ? JSON.stringify(body) : '';
    const o = { ...BASE, path, method, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bs), 'Cookie': cookie, ...headers } };
    const r = http.request(o, (res) => { let c = []; res.on('data', x => c.push(x)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(c).toString() })); });
    r.on('error', reject); if (bs) r.write(bs); r.end();
  });
}
function post(p, b, c, h) { return req('POST', p, b, c, h); }
function get(p, c) { return req('GET', p, null, c); }

function ok(label, cond, extra = '') { if (cond) { pass++; console.log(`  PASS: ${label}`); } else { fail++; console.log(`  FAIL: ${label} ${extra}`); } }
function parse(b) { try { return JSON.parse(b || '{}'); } catch { return {}; } }

const IDS = {
  school: '530b767975a6b8423702dd4c',
  year: '6939fa2c0947070c3b7f37bc',
  termT1: '896af361f44d06331f0203ca',
  classP1: '1a79b25157b67e1a843b8f0d',
};

async function main() {
  console.log('=== KIPS-SMS Report Lifecycle + RBAC Test ===\n');

  // ── Login as admin ────────────────────────────────────────────────
  console.log('[1] Admin login');
  const login = await post('/api/auth/login', { email: 'admin@kipsschool.ac', password: 'KipsAdmin2024!' });
  ok('login 200', login.status === 200, login.status);
  const sc = login.headers['set-cookie'] || [];
  const authCookie = sc.find(c => c.startsWith('kips_auth=')) || '';
  const csrfSecretCookie = sc.find(c => c.startsWith('kips_csrf_secret=')) || '';
  ok('cookies set', !!authCookie && !!csrfSecretCookie);

  // CSRF token - get without auth cookie first (server creates csrf_secret)
  const csrf = await get('/api/auth/csrf-token');
  const csrfToken = parse(csrf.body).csrfToken;
  const sc2 = csrf.headers['set-cookie'] || [];
  const csrfSecretFromCsrf = sc2.find(c => c.startsWith('kips_csrf_secret=')) || '';
  const writeCookie = [authCookie, csrfSecretFromCsrf].filter(Boolean).join('; ');
  const writeHeaders = { 'x-csrf-token': csrfToken };

  // ── 2. Generate a report ─────────────────────────────────────────
  console.log('\n[2] Generate report');
  const rg = await post('/api/reports/generate', {
    academicYear: IDS.year, term: IDS.termT1, class: IDS.classP1,
  }, writeCookie, writeHeaders);
  ok('generate report 200/201', [200, 201].includes(rg.status), rg.status + ' ' + rg.body.slice(0, 100));
  let reportId = '';
  if ([200, 201].includes(rg.status)) {
    const body = parse(rg.body);
    reportId = body.report?._id || body._id || '';
  }
  ok('reportId extracted', !!reportId);

  // ── 3. Report lifecycle: review → approve → publish ──────────────
  console.log('\n[3] Report lifecycle transitions');
  if (reportId) {
    const rev = await post(`/api/reports/${reportId}/review`, {}, writeCookie, writeHeaders);
    ok('review returns 200', rev.status === 200, rev.status + ' ' + rev.body.slice(0, 100));

    const ap = await post(`/api/reports/${reportId}/approve`, {}, writeCookie, writeHeaders);
    ok('approve returns 200', ap.status === 200, ap.status + ' ' + ap.body.slice(0, 100));

    const pub = await post(`/api/reports/${reportId}/publish`, {}, writeCookie, writeHeaders);
    ok('publish returns 200', pub.status === 200, pub.status + ' ' + pub.body.slice(0, 100));

    // Invalidate
    const inv = await post(`/api/reports/${reportId}/invalidate`, {}, writeCookie, writeHeaders);
    ok('invalidate returns 200', inv.status === 200, inv.status + ' ' + inv.body.slice(0, 100));
  }

  // ── 4. Create test users for RBAC ─────────────────────────────────
  console.log('\n[4] Create test users (DOS, TEACHER, CLASS_TEACHER)');
  const createUser = async (role, email, password) => {
    const r = await post('/api/users', {
      school: IDS.school, firstName: role, lastName: 'Test', email, password,
      role, status: 'active',
    }, writeCookie, writeHeaders);
    return r;
  };

  const dosUser = await createUser('DOS', 'dos@kipsschool.ac', 'DosPass123!');
  ok('create DOS user', dosUser.status === 201, dosUser.status + ' ' + dosUser.body.slice(0, 80));

  const teacherUser = await createUser('TEACHER', 'teacher@kipsschool.ac', 'TeacherPass123!');
  ok('create TEACHER user', teacherUser.status === 201, teacherUser.status + ' ' + teacherUser.body.slice(0, 80));

  const ctUser = await createUser('CLASS_TEACHER', 'classteacher@kipsschool.ac', 'CTPass123!');
  ok('create CLASS_TEACHER user', ctUser.status === 201, ctUser.status + ' ' + ctUser.body.slice(0, 80));

  // ── 5. Login as each role and test access ─────────────────────────
  console.log('\n[5] Role-based access tests');

  // DOS login
  const dosLogin = await post('/api/auth/login', { email: 'dos@kipsschool.ac', password: 'DosPass123!' });
  ok('DOS login 200', dosLogin.status === 200, dosLogin.status);
  const dosSc = dosLogin.headers['set-cookie'] || [];
  const dosAuth = dosSc.find(c => c.startsWith('kips_auth=')) || '';
  // Get fresh CSRF for DOS (without cookie, like admin pattern)
  const dosCsrf = await get('/api/auth/csrf-token');
  const dosCsrfToken = parse(dosCsrf.body).csrfToken;
  const dosCsrfSc2 = dosCsrf.headers['set-cookie'] || [];
  const dosCsrfSecret = dosCsrfSc2.find(c => c.startsWith('kips_csrf_secret=')) || '';
  const dosWriteCookie = [dosAuth, dosCsrfSecret].filter(Boolean).join('; ');
  const dosWriteHeaders = { 'x-csrf-token': dosCsrfToken };

  // TEACHER login
  const teacherLogin = await post('/api/auth/login', { email: 'teacher@kipsschool.ac', password: 'TeacherPass123!' });
  ok('TEACHER login 200', teacherLogin.status === 200, teacherLogin.status);
  const teacherSc = teacherLogin.headers['set-cookie'] || [];
  const teacherAuth = teacherSc.find(c => c.startsWith('kips_auth=')) || '';

  // CLASS_TEACHER login
  const ctLogin = await post('/api/auth/login', { email: 'classteacher@kipsschool.ac', password: 'CTPass123!' });
  ok('CLASS_TEACHER login 200', ctLogin.status === 200, ctLogin.status);
  const ctSc = ctLogin.headers['set-cookie'] || [];
  const ctAuth = ctSc.find(c => c.startsWith('kips_auth=')) || '';

  // ── 6. DOS access tests ───────────────────────────────────────────
  console.log('\n[6] DOS role access');
  const dosUsers = await get('/api/users', dosAuth);
  ok('DOS can list users (200)', dosUsers.status === 200, dosUsers.status);

  const dosSchools = await post('/api/schools', { name: 'DOS School', code: 'DOS1', email: 'dos1@test.ac' }, dosWriteCookie, dosWriteHeaders);
  ok('DOS can create school (201)', dosSchools.status === 201, dosSchools.status);

  // ── 7. TEACHER access tests ───────────────────────────────────────
  console.log('\n[7] TEACHER role access');
  const tUsers = await get('/api/users', teacherAuth);
  ok('TEACHER cannot list users (403)', tUsers.status === 403, tUsers.status);

  const tSchools = await post('/api/schools', { name: 'T School', code: 'TS1', email: 'ts1@test.ac' }, teacherAuth);
  ok('TEACHER cannot create school (403)', tSchools.status === 403, tSchools.status);

  // Teacher can read assessments
  const tAssessments = await get('/api/assessments', teacherAuth);
  ok('TEACHER can read assessments (200)', tAssessments.status === 200, tAssessments.status);

  // ── 8. CLASS_TEACHER access tests ─────────────────────────────────
  console.log('\n[8] CLASS_TEACHER role access');
  const ctUsers = await get('/api/users', ctAuth);
  ok('CLASS_TEACHER cannot list users (403)', ctUsers.status === 403, ctUsers.status);

  const ctStudents = await get('/api/students', ctAuth);
  ok('CLASS_TEACHER can read students (200)', ctStudents.status === 200, ctStudents.status);

  // ── 9. Report lifecycle with DOS ──────────────────────────────────
  console.log('\n[9] DOS report lifecycle');
  const dosReport = await post('/api/reports/generate', {
    academicYear: IDS.year, term: IDS.termT1, class: IDS.classP1,
  }, dosWriteCookie, dosWriteHeaders);
  ok('DOS can generate report (200/201)', [200, 201].includes(dosReport.status), dosReport.status);

  // ── 10. Logout ────────────────────────────────────────────────────
  console.log('\n[10] Logout all');
  const adminLogout = await post('/api/auth/logout', {}, writeCookie, writeHeaders);
  ok('admin logout 200', adminLogout.status === 200, adminLogout.status);

  const dosLogout = await post('/api/auth/logout', {}, dosWriteCookie, dosWriteHeaders);
  ok('DOS logout 200', dosLogout.status === 200, dosLogout.status);

  console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
