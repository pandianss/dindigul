import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verify() {
    const branch = await prisma.branch.findUnique({ where: { code: '3933' } });
    if (!branch) return;

    const panels = await prisma.misInformationPanel.findMany({
        where: {
            snapshot: { unitId: branch.id },
            parameter: 'Core Adv'
        },
        include: { snapshot: true }
    });

    console.log('--- Panels for SOL 3933 (Core Adv) ---');
    panels.forEach(p => {
        console.log(`Date: ${p.snapshot.businessDate.toISOString()} | Current: ${p.val_current} | Budget: ${p.budget_month} | FY Start: ${p.val_fy_start}`);
    });
    
    await prisma.$disconnect();
}
verify();
