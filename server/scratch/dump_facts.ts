import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function dumpFacts() {
    const branchCode = '1789';
    const dateStr = '2026-04-14';

    console.log(`--- Dumping Facts for SOL ${branchCode} on ${dateStr} ---`);
    const branch = await prisma.branch.findUnique({ where: { code: branchCode } });
    if (!branch) {
        console.log("Branch not found");
        return;
    }

    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));

    const facts = await prisma.fact.findMany({
        where: { unitId: branch.id, date },
        orderBy: { metric: 'asc' }
    });

    console.log(`Found ${facts.length} facts:`);
    facts.forEach(f => {
        console.log(`- ${f.metric}: ${f.value}`);
    });

    console.log("\n--- Checking MIS Panel ---");
    const panel = await (prisma as any).misInformationPanel.findMany({
        where: { unitId: branch.id, businessDate: date }
    });
    console.log(`Found ${panel.length} MIS panel entries:`);
    panel.forEach((p: any) => {
        console.log(`- ${p.parameter}: ${p.val_current}`);
    });

    await prisma.$disconnect();
}

dumpFacts();
