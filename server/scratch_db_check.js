const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { PrismaClient } = require('./src/generated/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL || '';
const parseConnectionString = (url) => {
  try {
    const parsed = new URL(url);
    return {
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432'),
      database: decodeURIComponent(parsed.pathname.split('/')[1] || ''),
    };
  } catch (e) {
    return { connectionString: url };
  }
};

const pool = new Pool(parseConnectionString(dbUrl));
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const metrics = await prisma.fact.findMany({
        distinct: ['metric'],
        select: { metric: true }
    });
    console.log('Metrics in Fact:', metrics.map(m => m.metric).sort());
    
    // Check for a specific branch showing 0 (e.g. 3933) on recent dates
    const branchFacts = await prisma.fact.findMany({
        where: { branch: { code: '3933' }, date: { gte: new Date('2026-04-14') } },
        select: { metric: true, value: true, date: true }
    });
    console.log('Branch 3933 Facts (Recent):');
    branchFacts.forEach(f => console.log(`${f.metric}: ${f.value} on ${f.date.toISOString().split('T')[0]}`));
}

main().catch(console.error).finally(() => {
    prisma.$disconnect();
    pool.end();
});
