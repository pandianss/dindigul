import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debug() {
    console.log('--- Master Branch Data Verification ---');
    const branches = await prisma.branch.findMany({
        take: 20,
        orderBy: { code: 'asc' },
        select: { code: true, nameEn: true }
    });

    console.log('Branch Code Samples:');
    branches.forEach(b => console.log(`[${b.code}] ${b.nameEn}`));

    const count = await prisma.branch.count();
    console.log('Total Branch Count:', count);

    const users = await prisma.user.findMany({
        take: 5,
        include: { branch: true }
    });
    console.log('User-Branch linkage samples:');
    users.forEach(u => console.log(`User: ${u.username}, BranchCode: ${u.branch?.code}`));

    await prisma.$disconnect();
    process.exit(0);
}

debug();
