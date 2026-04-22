import prisma from '../lib/prisma';

async function diagnostic() {
    console.log('--- DB DIAGNOSTIC START ---');
    try {
        const branchCount = await prisma.branch.count();
        console.log(`[PASS] Branch Count: ${branchCount}`);

        const userCount = await prisma.user.count();
        console.log(`[PASS] User Count: ${userCount}`);

        const deptCount = await prisma.department.count();
        console.log(`[PASS] Department Count: ${deptCount}`);

        if (branchCount === 0) {
            console.log('[WARN] Branches are empty. This is likely why "No data entries" is shown.');
        } else {
            const firstBranch = await prisma.branch.findFirst();
            console.log(`[INFO] Sample Branch: ${firstBranch?.nameEn} (${firstBranch?.code})`);
        }

    } catch (error: any) {
        console.error('[FAIL] Database Connection Error:', error.message);
    } finally {
        await prisma.$disconnect();
        console.log('--- DB DIAGNOSTIC END ---');
    }
}

diagnostic();
