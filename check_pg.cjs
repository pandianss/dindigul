const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres:iob%40123@localhost:5432/dindigul_db",
  ssl: false
});

async function check() {
  try {
    const res = await pool.query('SELECT COUNT(*) FROM branches');
    console.log('SQL_BRANCH_COUNT:' + res.rows[0].count);
    
    const res2 = await pool.query('SELECT * FROM branches LIMIT 1');
    console.log('SQL_SAMPLE:' + JSON.stringify(res2.rows[0]));
    
  } catch (e) {
    console.error('SQL_ERROR:' + e.message);
  } finally {
    await pool.end();
  }
}

check();
