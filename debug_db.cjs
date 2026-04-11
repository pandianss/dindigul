const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const branch = await prisma.branch.findUnique({ where: { code: '3437' } });
    if (!branch) {
        console.log('Branch 3437 not found');
        return;
    }
    console.log('Branch:', branch.nameEn, 'Type:', branch.type);

    const latestDate = new Date('2026-03-31');
    const facts = await prisma.fact.findMany({
        where: { unitId: branch.id, metric: 'CASA' },
        orderBy: { date: 'desc' },
        take: 5
    });
    console.log('Facts (CASA):', facts.map(f => ({ date: f.date, value: f.value })));

    const panels = await prisma.misInformationPanel.findMany({
        where: { 
            snapshot: { unitId: branch.id },
            parameter: 'CASA'
        },
        include: { snapshot: true },
        orderBy: { snapshot: { businessDate: 'desc' } },
        take: 5
    });
    console.log('Panels (CASA):', panels.map(p => ({ 
        date: p.snapshot.businessDate, 
        val_current: p.val_current,
        val_fy_start: p.val_fy_start
    })));
}

check().catch(console.error).finally(() => prisma.$disconnect());
