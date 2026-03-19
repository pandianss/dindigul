import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        include: { branch: true }
    });

    if (user) {
        console.log(`Sample User: ${user.username}`);
        console.log(`- Role: ${user.role}`);
        console.log(`- Branch: ${user.branch?.code || 'NULL'}`);
    } else {
        console.log('No users found in database');
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
