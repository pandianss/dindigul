const { Client } = require('pg');

const connectionString = "postgresql://postgres:iob%40123@localhost:5432/dindigul_db";

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to dindigul_db');
    
    const queries = [
      'ALTER TABLE letters ADD COLUMN IF NOT EXISTS "titleTa" TEXT',
      'ALTER TABLE letters ADD COLUMN IF NOT EXISTS "titleHi" TEXT',
      'ALTER TABLE letters ADD COLUMN IF NOT EXISTS "contentTa" TEXT',
      'ALTER TABLE letters ADD COLUMN IF NOT EXISTS "contentHi" TEXT',
      'ALTER TABLE letters ADD COLUMN IF NOT EXISTS "isExternal" BOOLEAN DEFAULT false',
      'ALTER TABLE letters ADD COLUMN IF NOT EXISTS "recipientName" TEXT',
      'ALTER TABLE letters ADD COLUMN IF NOT EXISTS "recipientAddress" TEXT',
      'ALTER TABLE letters ADD COLUMN IF NOT EXISTS "salutation" TEXT'
    ];

    for (const q of queries) {
      try {
        await client.query(q);
        console.log(`Executed: ${q}`);
      } catch (err) {
        console.error(`Error: ${err.message}`);
      }
    }

    const res = await client.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'letters\'');
    console.log('Columns in letters:', res.rows.map(r => r.column_name).join(', '));

  } catch (err) {
    console.error('Fatal:', err);
  } finally {
    await client.end();
  }
}

run();
