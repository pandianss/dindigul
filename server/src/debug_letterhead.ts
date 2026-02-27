import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- User Details ---');
    const users = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        include: { branch: true }
    });
    console.log(JSON.stringify(users, null, 2));

    console.log('\n--- RO Branch Details ---');
    const ro = await (prisma as any).branch.findUnique({
        where: { code: '6100' }
    });
    console.log(JSON.stringify(ro, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
