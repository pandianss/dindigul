import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
    console.log('--- Final Standards Verification ---');

    // 1. Check for unpadded SOLs
    const allBranches = await prisma.branch.findMany({ select: { code: true, nameEn: true } });
    const unpadded = allBranches.filter(b => b.code.length < 4);

    console.log(`Total Branches: ${allBranches.length}`);
    console.log(`Unpadded Branches: ${unpadded.length}`);
    if (unpadded.length > 0) {
        console.log('UNPADDED CODES DETECTED:', unpadded.map(u => u.code));
    } else {
        console.log('All branch codes are 4+ characters. Standard enforced.');
    }

    // 2. Check BudgetMaster
    const unpaddedBudgets = await prisma.budgetMaster.findMany({
        where: { OR: [{ solId: { lt: '0000' } }] }, // This might not work for strings, relying on length instead
        select: { solId: true },
        distinct: ['solId']
    });
    // Distinct check by length
    const allBudgetSols = await prisma.budgetMaster.findMany({
        select: { solId: true },
        distinct: ['solId']
    });
    const badBudgets = allBudgetSols.filter(b => b.solId.length < 4);
    console.log(`Budget SOLs needing padding: ${badBudgets.length}`);
    if (badBudgets.length > 0) {
        console.log('BAD BUDGET SOLS:', badBudgets.map(b => b.solId));
    }

    // 3. User Permission Context Check
    const users = await prisma.user.findMany({
        include: { branch: true }
    });
    const orphans = users.filter(u => u.branchId && !u.branch);
    console.log(`Orphaned Users: ${orphans.length}`);

    // Check if current user session is affected (if we knew their ID)
    // Looking for users with null branchId who AREN'T admin
    const suspiciousUsers = users.filter(u => u.role !== 'ADMIN' && !u.branchId);
    console.log(`Non-Admin Users with no branch: ${suspiciousUsers.length}`);

    await prisma.$disconnect();
    process.exit(0);
}

verify();
