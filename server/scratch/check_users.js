const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: { username: true, fullNameEn: true, role: true }
        });
        console.log(JSON.stringify(users, null, 2));
    } catch (err) {
        console.error('Error fetching users:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
