const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres:iob%40123@localhost:5432/dindigul_db"
    });

    try {
        await client.connect();
        const res = await client.query('SELECT username, "fullNameEn", role FROM users');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error fetching users:', err);
    } finally {
        await client.end();
    }
}

main();
