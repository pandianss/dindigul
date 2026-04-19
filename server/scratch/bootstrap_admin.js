
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../src/generated/client');
const bcrypt = require('bcryptjs');

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
        console.log('--- DINDIGUL PASSWORD RECOVERY ---');
        
        const username = 'admin';
        const rawPassword = 'admin123';
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        console.log(`Resetting password for user: ${username}...`);

        await prisma.user.upsert({
            where: { username },
            update: {
                passwordHash,
                failedLoginAttempts: 0,
                lockedUntil: null
            },
            create: {
                username,
                passwordHash,
                fullNameEn: 'System Administrator',
                role: 'ADMIN',
                section: 'Planning',
                grade: 'SCALE IV',
                gender: 'MALE'
            }
        });

        console.log('\nSUCCESS: Admin credentials have been reset!');
        console.log('--------------------------------------');
        console.log(`Username: ${username}`);
        console.log(`Password: ${rawPassword}`);
        console.log('--------------------------------------');
        console.log('Result: The account is now unlocked and the password is set to admin123.');

    } catch (err) {
        console.error('\nERROR during recovery:', err.message);
        if (err.stack) console.error(err.stack);
    } finally {
        await prisma.$disconnect();
    }
}

main();
