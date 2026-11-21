'use strict';
const http = require('http');

const BASE = { hostname: 'localhost', port: 5001 };

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

function post(path, body, cookie = '', headers = {}) { return req('POST', path, body, cookie, headers); }
function get(path, cookie = '') { return req('GET', path, null, cookie); }

(async () => {
  // Login
  const login = await post('/api/auth/login', { email: 'admin@kipsschool.ac', password: 'KipsAdmin2024!' });
  console.log('Login status:', login.status);
  console.log('Login body:', login.body);
  console.log('Set-Cookie headers:', JSON.stringify(login.headers['set-cookie']));
  
  const sc = login.headers['set-cookie'] || [];
  const authCookie = sc.find(c => c.startsWith('kips_auth=')) || '';
  console.log('\nAuth cookie:', authCookie ? authCookie.substring(0, 80) + '...' : 'NOT FOUND');
  
  // Try /me
  try {
    const me = await get('/api/auth/me', authCookie);
    console.log('\n/me status:', me.status);
    console.log('/me body:', me.body);
  } catch (e) {
    console.log('\n/me error:', e.message);
  }
})();
