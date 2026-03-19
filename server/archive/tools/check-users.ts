import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
    console.log('--- Comprehensive User-Branch Audit ---');
    const users = await prisma.user.findMany({
        include: { branch: true }
    });

    console.log(`Total Users: ${users.length}`);

    const unlinked = users.filter(u => !u.branch);
    console.log(`Users without linked branch: ${unlinked.length}`);
    if (unlinked.length > 0) {
        console.log('Sample unlinked users:', unlinked.slice(0, 5).map(u => ({ username: u.username, role: u.role, branchId: u.branchId })));
    }

    const linked = users.filter(u => u.branch);
    console.log(`Users with valid branch links: ${linked.length}`);

    // Check if any user has a role that might be restricted
    const adminUsers = users.filter(u => u.role === 'ADMIN');
    console.log(`Admin Users: ${adminUsers.length}`);

    await prisma.$disconnect();
    process.exit(0);
}

checkUsers();
