const http = require('http');

function request(method, path, data) {
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
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function verify() {
    console.log("Starting verification...");

    // 1. Create a new branch with classification
    const newBranch = {
        code: 'TEST-VERIFY-HTTP',
        officeId: 9900,
        nameEn: 'Http Verification Branch',
        type: 'BRANCH',
        populationGroup: 'RURAL',
        specialStatus: ['Agri', 'Micro'],
        riskCategory: 'LOW',
        riskEffectiveDate: new Date().toISOString()
    };

    console.log("Creating branch:", newBranch);
    try {
        const created = await request('POST', '/api/units', newBranch);
        console.log("Created successfully:", created);

        if (created.populationGroup !== 'RURAL' || created.riskCategory !== 'LOW') {
            console.error("Verification Failed: Fields mismatch on creation.");
            return;
        }

        // 2. Update the branch risk category
        console.log("Updating risk category to HIGH...");
        const updated = await request('PUT', `/api/units/${created.id}`, {
            ...created,
            riskCategory: 'HIGH',
            specialStatus: ['Agri', 'Micro', 'Captive']
        });
        console.log("Updated successfully:", updated);

        if (updated.riskCategory !== 'HIGH') {
            console.error("Verification Failed: Risk category not updated.");
            return;
        }

        // 3. Cleanup
        console.log("Cleaning up...");
        await request('DELETE', `/api/units/${created.id}`);
        console.log("Verification Complete: SUCCESS");

    } catch (err) {
        console.error("Verification Error:", err);
    }
}

verify();
