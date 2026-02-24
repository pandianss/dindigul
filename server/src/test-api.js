const http = require('http');

const testUpdate = (key, value) => {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ key, value });
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/planning/config',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            let response = '';
            res.on('data', d => response += d);
            res.on('end', () => resolve({ status: res.statusCode, body: response }));
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
};

async function run() {
    console.log('Testing Analytics endpoint...');
    const resA = await new Promise((resolve, reject) => {
        const options = { hostname: 'localhost', port: 5000, path: '/api/planning/analytics', method: 'GET' };
        const req = http.request(options, (res) => {
            let response = '';
            res.on('data', d => response += d);
            res.on('end', () => resolve({ status: res.statusCode, body: response }));
        });
        req.on('error', reject);
        req.end();
    });
    console.log('Analytics Result Status:', resA.status);
    console.log('Analytics Result Body:', JSON.stringify(JSON.parse(resA.body), null, 2));

    console.log('Testing SB threshold update...');
    const res1 = await testUpdate('MIN_SB_BALANCE_THRESHOLD', 555);
    console.log('SB Result:', res1);

    console.log('Testing CD threshold update...');
    const res2 = await testUpdate('MIN_CD_BALANCE_THRESHOLD', 1111);
    console.log('CD Result:', res2);

    console.log('Waiting 5s for re-processing...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('Testing Intelligence Reports...');
    const resI = await new Promise((resolve, reject) => {
        const options = { hostname: 'localhost', port: 5000, path: '/api/planning/intelligence-reports', method: 'GET' };
        const req = http.request(options, (res) => {
            let response = '';
            res.on('data', d => response += d);
            res.on('end', () => resolve({ status: res.statusCode, body: response }));
        });
        req.on('error', reject);
        req.end();
    });
    console.log('Intelligence Result Body:', JSON.stringify(JSON.parse(resI.body).rejectionSummary, null, 2));
}

run();
