
import { PrismaClient } from '../src/generated/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.user.count();
        console.log(`User Count: ${count}`);
        if (count > 0) {
            const users = await prisma.user.findMany({ select: { username: true, role: true } });
            console.log('Users:', users);
        } else {
            console.log('No users found in database.');
        }
    } catch (err) {
        console.error('Database connection failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
