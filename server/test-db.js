const { PrismaClient } = require('./src/generated/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

async function main() {
  const dbUrl = process.env.DATABASE_URL || '';
  const parsed = new URL(dbUrl);
  const pool = new Pool({ 
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    database: decodeURIComponent(parsed.pathname.split('/')[1] || ''),
    port: parseInt(parsed.port || '5432'),
    max: 1,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const count = await prisma.branch.count();
    console.log('Branch count:', count);
    const branches = await prisma.branch.findMany({ take: 5 });
    console.log('Sample branches:', branches.map(b => b.nameEn));
  } catch (err) {
    console.error('Error querying branches:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
