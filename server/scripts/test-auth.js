const http = require('http');

const request = (path, method = 'GET', body = null) => {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : '';
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: `/api/auth${path}`,
            method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            let response = '';
            res.on('data', d => response += d);
            res.on('end', () => resolve({ status: res.statusCode, body: response ? JSON.parse(response) : {} }));
        });

        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
};

async function test() {
    console.log('--- Testing Auto-Login ---');
    const autoLoginRes = await request('/auto-login');
    console.log('Status:', autoLoginRes.status);
    console.log('Body:', JSON.stringify(autoLoginRes.body, null, 2));

    if (autoLoginRes.status === 200) {
        console.log('SUCCESS: Auto-login worked for current OS user.');
    } else if (autoLoginRes.status === 404) {
        console.log('INFO: OS user not found in staff list (Expected if your OS username is not a Roll number).');
    } else if (autoLoginRes.status === 401) {
        console.log('INFO: Admin detected, manual login required (Expected if OS user is "admin").');
    }

    console.log('\n--- Testing Manual Login with Session ---');
    const loginRes = await request('/login', 'POST', { username: 'admin', password: 'admin123' });
    console.log('Status:', loginRes.status);
    if (loginRes.status === 200) {
        console.log('SUCCESS: Admin logged in manually.');
        console.log('Token received:', loginRes.body.token.substring(0, 20) + '...');
    } else {
        console.log('FAILED: Manual login failed.');
    }
}

test();
