import axios from 'axios';

async function main() {
    try {
        const authRes = await axios.get('http://localhost:5000/api/auth/auto-login');
        const token = authRes.data.token;
        console.log('Logged in as:', authRes.data.user.username, 'Role:', authRes.data.user.role, 'Section:', authRes.data.user.section);

        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        const testId = 'b38014e2-0db2-4d7c-8c54-eb2addabffd2';
        console.log(`Testing HTTP DELETE for exact user import: ${testId}`);

        // Hit the API
        const response = await axios.delete(`http://localhost:5000/api/mis/import-logs/${testId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Success:', response.status, response.data);

    } catch (error: any) {
        console.error('HTTP Error!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

main();
