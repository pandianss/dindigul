const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres:iob%40123@localhost:5432/dindigul_db"
    });

    try {
        await client.connect();
        const res = await client.query('SELECT username FROM users WHERE username = $1', ['63039']);
        if (res.rows.length > 0) {
            console.log('User 63039 EXISTS');
        } else {
            console.log('User 63039 DOES NOT EXIST');
        }
    } catch (err) {
        console.error('Error fetching user:', err);
    } finally {
        await client.end();
    }
}

main();
