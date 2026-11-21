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
  console.log('=== KIPS-SMS Report Lifecycle Test ===\n');

  // Login as admin
  console.log('[1] Admin login');
  const login = await post('/api/auth/login', { email: 'admin@kipsschool.ac', password: 'KipsAdmin2024!' });
  ok('login 200', login.status === 200, login.status);
  const sc = login.headers['set-cookie'] || [];
  const authCookie = sc.find(c => c.startsWith('kips_auth=')) || '';

  // Get CSRF token (without auth cookie - server creates fresh csrf_secret)
  const csrf = await get('/api/auth/csrf-token');
  const csrfToken = parse(csrf.body).csrfToken;
  const sc2 = csrf.headers['set-cookie'] || [];
  const csrfSecret = sc2.find(c => c.startsWith('kips_csrf_secret=')) || '';
  const writeCookie = [authCookie, csrfSecret].filter(Boolean).join('; ');
  const writeHeaders = { 'x-csrf-token': csrfToken };

  // Generate report
  console.log('\n[2] Generate report');
  const rg = await post('/api/reports/generate', {
    academicYear: IDS.year, term: IDS.termT1, class: IDS.classP1,
  }, writeCookie, writeHeaders);
  ok('generate 200/201', [200, 201].includes(rg.status), rg.status);
  let reportId = '';
  if ([200, 201].includes(rg.status)) {
    const body = parse(rg.body);
    reportId = body.report?._id || body._id || (body.reports?.[0]?._id) || '';
  }
  ok('reportId extracted', !!reportId, reportId || 'none');

  // Report lifecycle transitions
  console.log('\n[3] Report lifecycle');
  if (reportId) {
    const rev = await post(`/api/reports/${reportId}/review`, {}, writeCookie, writeHeaders);
    ok('review 200', rev.status === 200, rev.status + ' ' + rev.body.slice(0, 100));

    const ap = await post(`/api/reports/${reportId}/approve`, {}, writeCookie, writeHeaders);
    ok('approve 200', ap.status === 200, ap.status + ' ' + ap.body.slice(0, 100));

    const pub = await post(`/api/reports/${reportId}/publish`, {}, writeCookie, writeHeaders);
    ok('publish 200', pub.status === 200, pub.status + ' ' + pub.body.slice(0, 100));

    const inv = await post(`/api/reports/${reportId}/invalidate`, {}, writeCookie, writeHeaders);
    ok('invalidate 200', inv.status === 200, inv.status + ' ' + inv.body.slice(0, 100));
  }

  // List reports
  console.log('\n[4] List reports');
  const lr = await get('/api/reports', authCookie);
  ok('list reports 200', lr.status === 200, lr.status);

  // Logout
  console.log('\n[5] Logout');
  const lg = await post('/api/auth/logout', {}, writeCookie, writeHeaders);
  ok('logout 200', lg.status === 200, lg.status);

  console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
