import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check1789() {
    console.log("--- Checking SOL 1789 (Branch ID lookup) ---");
    const branch = await prisma.branch.findUnique({ where: { code: '1789' } });
    if (!branch) {
        console.log("Branch 1789 not found");
        return;
    }
    console.log(`Branch found: ${branch.nameEn} (ID: ${branch.id})`);

    const date = '2026-04-14'; // Business date from user's CSV context
    const [y, m, d] = date.split('-').map(Number);
    const businessDate = new Date(Date.UTC(y, m - 1, d));

    console.log(`\n--- Checking MIS Panel Data for ${date} ---`);
    const snapshot = await prisma.misSnapshot.findFirst({
        where: { unitId: branch.id, businessDate },
        include: { panelData: true }
    });

    if (!snapshot) {
        console.log("No snapshot found for this date");
    } else {
        console.log(`Snapshot found with ${snapshot.panelData.length} records`);
        console.log("Sample parameters:", snapshot.panelData.map(p => p.parameter).slice(0, 10));
    }

    console.log(`\n--- Checking Exceptions for ${date} ---`);
    const exceptions = await prisma.misException.findMany({
        where: { unitId: branch.id, businessDate }
    });
    console.log(`Found ${exceptions.length} exceptions:`);
    exceptions.forEach(e => console.log(`- [${e.ruleId}] ${e.parameter}: ${e.message}`));

    console.log(`\n--- Done ---`);
    await prisma.$disconnect();
}

check1789();
