import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

async function main() {
    const username = (process.env.ADMIN_RESET_USERNAME || 'admin').trim();
    const password = process.env.ADMIN_RESET_PASSWORD;

    if (!password || password.length < 8) {
        throw new Error('ADMIN_RESET_PASSWORD must be set and at least 8 characters long.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { username },
        update: {
            passwordHash,
            role: 'ADMIN',
            failedLoginAttempts: 0 as any,
            lockedUntil: null as any
        },
        create: {
            username,
            passwordHash,
            fullNameEn: 'System Administrator',
            role: 'ADMIN',
            section: 'IT',
            failedLoginAttempts: 0 as any,
            lockedUntil: null as any
        }
    });

    console.log(`Admin credential reset complete for username: ${user.username}`);
}

main()
    .catch((err) => {
        console.error('[resetAdminPassword] Failed:', err.message);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

