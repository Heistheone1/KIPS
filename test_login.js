const request = require('http');

function post(path, data, cookie = '') {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 5001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Cookie': cookie,
      },
    };
    const req = request.request(options, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        resolve({ status: res.statusCode, headers: res.headers, body: text });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(path, cookie = '') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path,
      method: 'GET',
      headers: { 'Cookie': cookie },
    };
    const req = request.request(options, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        resolve({ status: res.statusCode, headers: res.headers, body: text });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  // Health check
  const health = await get('/health');
  console.log('HEALTH:', health.status, health.body);

  // Login
  const login = await post('/api/auth/login', { email: 'admin@kipsschool.ac', password: 'KipsAdmin2024!' });
  console.log('\nLOGIN:', login.status);
  console.log('Set-Cookie:', login.headers['set-cookie']);
  console.log('Body:', login.body);

  // Extract auth cookie
  const setCookies = login.headers['set-cookie'] || [];
  const authCookie = setCookies.find(c => c.startsWith('kips_auth='));
  console.log('\nAuth cookie found:', !!authCookie);
})();