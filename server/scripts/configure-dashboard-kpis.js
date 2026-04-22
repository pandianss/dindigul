
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const kpis = [
  { id: 'SB', name: 'SAVINGS DEPOSITS', order: 0, cat: 'KBP' },
  { id: 'CD', name: 'CURRENT DEPOSITS', order: 1, cat: 'KBP' },
  { id: 'CASA', name: 'CASA (SB+CD)', order: 2, cat: 'KBP' },
  { id: 'TD', name: 'TERM DEPOSITS', order: 3, cat: 'KBP' },
  { id: 'Adv', name: 'TOTAL ADVANCES', order: 4, cat: 'KBP' },
  { id: 'Bus', name: 'TOTAL BUSINESS', order: 5, cat: 'KBP' }
];

async function run() {
  console.log('🔄 Configuring Dashboard KPIs in Registry...');
  
  try {
    // 1. Disable all currently enabled 'CASH' metrics from appearing first if they are enabled
    await pool.query("UPDATE mis_parameter_registry SET \"isEnabled\" = false WHERE \"category\" = 'CASH'");
    
    // 2. Upsert the priority metrics
    for (const kpi of kpis) {
      const res = await pool.query(
        `INSERT INTO mis_parameter_registry ("parameterName", "displayName", "orderIndex", "category", "isEnabled")
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT ("parameterName") 
         DO UPDATE SET "displayName" = $2, "orderIndex" = $3, "category" = $4, "isEnabled" = true`,
        [kpi.id, kpi.name, kpi.order, kpi.cat]
      );
      console.log(`✅ Configured ${kpi.id}`);
    }

    console.log('✨ Dashboard KPIs configured successfully.');
  } catch (err) {
    console.error('❌ Error configuring KPIs:', err);
  } finally {
    await pool.end();
  }
}

run();
