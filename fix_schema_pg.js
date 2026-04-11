import pkg from 'pg';
const { Client } = pkg;

const connectionString = "postgresql://postgres:iob%40123@localhost:5432/dindigul_db";

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to dindigul_db');
    
    console.log('Adding missing columns to "letters" table...');
    
    // Check and add columns
    const columns = [
      { name: 'titleTa', type: 'TEXT' },
      { name: 'titleHi', type: 'TEXT' },
      { name: 'contentTa', type: 'TEXT' },
      { name: 'contentHi', type: 'TEXT' }
    ];

    for (const col of columns) {
      try {
        await client.query(`ALTER TABLE letters ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}`);
        console.log(`Column "${col.name}" added or already exists.`);
      } catch (err) {
        console.error(`Error adding column "${col.name}":`, err.message);
      }
    }

    console.log('--- FINAL COLUMN LIST ---');
    const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'letters'`);
    console.table(res.rows);

  } catch (err) {
    console.error('Critical error:', err);
  } finally {
    await client.end();
  }
}

run();
