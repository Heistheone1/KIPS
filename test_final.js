'use strict';

const http = require('http');

const BASE = { hostname: 'localhost', port: 5001 };

const IDS = {
  school: '530b767975a6b8423702dd4c',
  year: '6939fa2c0947070c3b7f37bc',      // 2025-2026
  year2627: 'd6a97c56442836857850017c',  // 2026-2027
  termT1: '896af361f44d06331f0203ca',    // Term 1 T1 for 2025-2026
  termT1_2627: '3ca1a37cb831d427d104f217', // Term 1 T1-2627 for 2026-2027
  classP1: '1a79b25157b67e1a843b8f0d',   // P1 - PRIMARY (2025-2026)
  classP1_2627: 'df4dd9d0961688a92188c6cf', // Primary 1 (2026-2027)
  classN1: '6120367c0291bf6a2c4c5b2a',   // N1 - NURSERY (2025-2026)
  subjectMath: 'b581614c23cb6afe4d9a5db4', // MATHEMATICS (P1 class, 2025-2026)
  studentP1: 'dd560c4c2f1af7939d109b75',  // P1-001 Innocent Mugisha
  assessmentMathExam: 'bfebb3118aff8702f1e6bf88', // Math Exam for P1 class
  catAssessment: '54295363dd074c6fbc710036', // Ass CAT (CAT type) for Primary 1 2026-2027
};

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
    ok('me returns ADMIN', u && u.role === 'ADMIN', u ? u.role : 'none');
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
  console.log('\n[4] Read endpoints (authenticated)');
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

  // ── 5. Assessment engine with real data ───────────────────────────
  console.log('\n[5] Assessment engine');
  const ga = await get(`/api/assessments/${IDS.assessmentMathExam}`, authCookie);
  ok('get assessment by ID returns 200', ga.status === 200, ga.status);

  const gm = await get('/api/assessment-marks', authCookie);
  ok('list assessment marks returns 200', gm.status === 200, gm.status);

  // Record a mark - correct field names: assessmentId, studentId
  const rm = await post('/api/assessment-marks', {
    assessmentId: IDS.assessmentMathExam,
    studentId: IDS.studentP1,
    score: 92,
    entered: true,
  }, writeCookie, writeHeaders);
  ok('record mark returns 201', rm.status === 201, rm.status + ' ' + rm.body.slice(0, 100));
  let markId = '';
  if (rm.status === 201) markId = parse(rm.body).mark?._id || parse(rm.body)._id || '';

  // Bulk record marks
  const bm = await post('/api/assessment-marks/bulk', {
    assessmentId: IDS.assessmentMathExam,
    marks: [{ studentId: IDS.studentP1, score: 95, entered: true }],
  }, writeCookie, writeHeaders);
  ok('bulk record marks returns 200/201', [200, 201].includes(bm.status), bm.status + ' ' + bm.body.slice(0, 100));

  // Mark history
  if (markId) {
    const mh = await get(`/api/assessment-marks/${markId}/history`, authCookie);
    ok('mark history returns 200', mh.status === 200, mh.status);
  }

  // ── 6. Result engine ──────────────────────────────────────────────
  console.log('\n[6] Result engine');
  // Generate subject result - correct term for year
  const gr = await post('/api/results/subject/generate', {
    academicYear: IDS.year,
    term: IDS.termT1,
    class: IDS.classP1,
    subject: IDS.subjectMath,
  }, writeCookie, writeHeaders);
  ok('generate subject result returns 200/201', [200, 201].includes(gr.status), gr.status + ' ' + gr.body.slice(0, 100));

  // Generate term result
  const gt = await post('/api/results/term/generate', {
    academicYear: IDS.year,
    term: IDS.termT1,
    class: IDS.classP1,
  }, writeCookie, writeHeaders);
  ok('generate term result returns 200/201', [200, 201].includes(gt.status), gt.status + ' ' + gt.body.slice(0, 100));

  // List subject results
  const lsr = await get('/api/results/subject?academicYear=' + IDS.year + '&term=' + IDS.termT1 + '&class=' + IDS.classP1 + '&subject=' + IDS.subjectMath, authCookie);
  ok('list subject results returns 200', lsr.status === 200, lsr.status + ' body:' + (lsr.body || '').slice(0, 200));

  // List term results
  const ltr = await get('/api/results/term?academicYear=' + IDS.year + '&term=' + IDS.termT1 + '&class=' + IDS.classP1, authCookie);
  ok('list term results returns 200', ltr.status === 200, ltr.status + ' body:' + (ltr.body || '').slice(0, 200));

  // Results status
  const rs = await get('/api/results/status?academicYear=' + IDS.year + '&term=' + IDS.termT1, authCookie);
  ok('results status returns 200', rs.status === 200, rs.status);

  // Grading scales
  const gs = await get('/api/results/grading-scales', authCookie);
  ok('list grading scales returns 200', gs.status === 200, gs.status);

  // Save grading scale - correct field: bands, minPercentage, maxPercentage
  const sgs = await post('/api/results/grading-scale', {
    academicYear: IDS.year,
    bands: [{ grade: 'A', minPercentage: 80, maxPercentage: 100, remark: 'Excellent' }],
  }, writeCookie, writeHeaders);
  ok('save grading scale returns 200/201', [200, 201].includes(sgs.status), sgs.status + ' ' + sgs.body.slice(0, 100));

  // Recalculate results
  const rc = await post('/api/results/recalculate', {
    academicYear: IDS.year,
    term: IDS.termT1,
    class: IDS.classP1,
  }, writeCookie, writeHeaders);
  ok('recalculate returns 200/201', [200, 201].includes(rc.status), rc.status + ' ' + rc.body.slice(0, 100));

  // ── 7. Report engine ──────────────────────────────────────────────
  console.log('\n[7] Report engine');
  const rg = await post('/api/reports/generate', {
    academicYear: IDS.year,
    term: IDS.termT1,
    class: IDS.classP1,
  }, writeCookie, writeHeaders);
  ok('generate report returns 200/201', [200, 201].includes(rg.status), rg.status + ' ' + rg.body.slice(0, 100));
  let reportId = '';
  if (rg.status === 201) reportId = parse(rg.body).report?._id || parse(rg.body)._id || '';

  // ── 7b. Period/CAT Report engine ─────────────────────────────────
  console.log('\n[7b] Period/CAT Report engine');
  const rpg = await post('/api/reports/generate-period', {
    academicYear: IDS.year2627,
    term: IDS.termT1_2627,
    class: IDS.classP1_2627,
    catAssessment: IDS.catAssessment,
    periodType: 'CAT',
  }, writeCookie, writeHeaders);
  ok('generate period report returns 200/201', [200, 201].includes(rpg.status), rpg.status + ' ' + rpg.body.slice(0, 100));
  let periodReportId = '';
  if ([200, 201].includes(rpg.status)) {
    const body = parse(rpg.body);
    periodReportId = body.results?.[0]?.card?._id || body.results?.[0]?.version?._id || '';
  }
  ok('period reportId extracted', !!periodReportId, periodReportId || 'none');

  // List reports with periodType filter
  const lr2 = await get('/api/reports?periodType=CAT', authCookie);
  ok('list reports with periodType=CAT returns 200', lr2.status === 200, lr2.status);

  // List reports
  const lr = await get('/api/reports', authCookie);
  ok('list reports returns 200', lr.status === 200, lr.status);

  // ── 8. CSRF protection ────────────────────────────────────────────
  console.log('\n[8] CSRF protection');
  const nocsrf = await post('/api/schools', { name: 'NoCSRF', code: 'NCS1', email: 'ncs1@test.ac' }, authCookie);
  ok('POST without CSRF token returns 403', nocsrf.status === 403, nocsrf.status);

  // ── 9. Logout ─────────────────────────────────────────────────────
  console.log('\n[9] Logout');
  const lg = await post('/api/auth/logout', {}, writeCookie, writeHeaders);
  ok('logout returns 200', lg.status === 200, lg.status);

  // ── 10. Security tests ────────────────────────────────────────────
  console.log('\n[10] Security tests');
  const badlogin = await post('/api/auth/login', { email: 'admin@kipsschool.ac', password: 'wrongpassword' });
  ok('wrong password returns 401', badlogin.status === 401, badlogin.status);

  const noauth = await get('/api/auth/me');
  ok('me without cookie returns 401', noauth.status === 401, noauth.status);

  console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('FATAL:', e.message, e.stack); process.exit(1); });