const http = require('http');

function request(method, path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body);
                    }
                } else {
                    reject({ status: res.statusCode, body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

async function verify() {
    console.log("Checking /api/departments...");
    try {
        const departments = await request('GET', '/api/departments');
        console.log("Status: OK");
        console.log("Count:", Array.isArray(departments) ? departments.length : 'Not an array');
        console.log("Data:", JSON.stringify(departments, null, 2));
    } catch (err) {
        console.error("Error fetching departments:", err);
    }
}

verify();
