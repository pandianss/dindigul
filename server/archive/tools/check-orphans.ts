import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    console.log('--- User Permission Context Audit ---');
    const totalUsers = await prisma.user.count();
    const nullBranchUsers = await prisma.user.findMany({
        where: { branchId: null },
        select: { id: true, username: true }
    });

    // Check for invalid branchId (UUID points to nothing)
    const withBranchId = await prisma.user.findMany({
        where: { NOT: { branchId: null } },
        select: { id: true, username: true, branchId: true }
    });

    const branches = await prisma.branch.findMany({ select: { id: true } });
    const branchIds = new Set(branches.map(b => b.id));

    const orphanedUsers = withBranchId.filter(u => !branchIds.has(u.branchId!));

    console.log(`Total Users: ${totalUsers}`);
    console.log(`Users with null branchId: ${nullBranchUsers.length}`);
    console.log(`Users with orphaned branchId: ${orphanedUsers.length}`);

    if (orphanedUsers.length > 0) {
        console.log('Sample Orphans:', orphanedUsers.slice(0, 5).map(u => ({ username: u.username, id: u.id, branchId: u.branchId })));
    }

    // Check for "Branch 174" placeholders that might have been recreated with new UUIDs
    const branch174_old = await prisma.branch.findMany({
        where: { code: '174' }
    });
    const branch174_new = await prisma.branch.findMany({
        where: { code: '0174' }
    });
    console.log('Branches with code 174:', branch174_old.length);
    console.log('Branches with code 0174:', branch174_new.length);

    await prisma.$disconnect();
    process.exit(0);
}

check();
