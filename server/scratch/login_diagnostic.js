
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../src/generated/client');
const os = require('os');

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
        const sysUser = os.userInfo().username;
        console.log(`--- LOGIN DIAGNOSTIC FOR USER: ${sysUser} ---`);
        console.log(`OS Username detected: '${sysUser}'`);
        
        const user = await prisma.user.findUnique({
            where: { username: sysUser },
            include: { branch: true }
        });

        if (!user) {
            console.log(`RESULT: User '${sysUser}' NOT FOUND in database.`);
            const closeMatch = await prisma.user.findFirst({
                where: { username: { contains: sysUser, mode: 'insensitive' } }
            });
            if (closeMatch) console.log(`SUGGESTION: Found a similar user: '${closeMatch.username}'`);
        } else {
            console.log(`RESULT: User '${sysUser}' exists (Role: ${user.role}, Branch: ${user.branch?.code || 'None'}).`);
            console.log(`MFA Enabled: ${user.mfaEnabled || false}`);
            console.log(`Locked Until: ${user.lockedUntil || 'Not Locked'}`);
        }

        console.log('\n--- RECENT AUDIT LOGS ---');
        const logs = await prisma.loginAuditLog.findMany({
            where: { username: sysUser },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        if (logs.length === 0) {
            console.log('No login attempts recorded for this username.');
        } else {
            logs.forEach(l => {
                console.log(`[${l.createdAt.toISOString()}] ${l.event} | IP: ${l.ipAddress} | Meta: ${l.metadata}`);
            });
        }

    } catch (err) {
        console.error('Diagnostic failed:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
