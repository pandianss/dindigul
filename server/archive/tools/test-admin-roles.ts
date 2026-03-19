import fetch from 'node-fetch';

async function testAdminRoleSelection() {
    console.log('--- Testing Admin Role Selection (Backend) ---');
    const roles = ['ADMIN', 'RO_MANAGER', 'BRANCH_USER', 'GUEST'];

    for (const role of roles) {
        try {
            const res = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'admin',
                    password: 'admin123',
                    role: role
                })
            });

            const data: any = await res.json();
            if (res.ok) {
                console.log(`SUCCESS: Logged in as admin with role: ${role}`);
                console.log(`Token Role: ${data.user.role}`);
                if (data.user.role !== role) {
                    console.error(`FAILED: Role mismatch. Expected ${role}, got ${data.user.role}`);
                }
            } else {
                console.error(`FAILED: Login failed for role ${role}:`, data.error);
            }
        } catch (error) {
            console.error(`ERROR: Request failed for role ${role}:`, error);
        }
    }
}

testAdminRoleSelection();
