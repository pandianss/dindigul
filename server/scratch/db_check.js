
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../src/generated/client');

// Configuration from .env
const DATABASE_URL = "postgresql://postgres:iob%40123@localhost:5432/dindigul_db";

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

const pool = new Pool(parseConnectionString(DATABASE_URL));
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    try {
        console.log('--- DINDIGUL USER AUDIT ---');
        const count = await prisma.user.count();
        console.log(`Total System Users: ${count}`);
        
        const users = await prisma.user.findMany({ 
            select: { username: true, role: true, fullNameEn: true, lockedUntil: true } 
        });
        
        console.log('\n--- ACTIVE USER LIST ---');
        users.forEach(u => {
            const status = u.lockedUntil && new Date(u.lockedUntil) > new Date() ? 'LOCKED' : 'ACTIVE';
            console.log(`- ${u.username} (${u.role}) | ${u.fullNameEn} | [${status}]`);
        });

    } catch (err) {
        console.error('Audit failed:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
