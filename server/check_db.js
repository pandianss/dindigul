const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
    const branches = await prisma.branch.groupBy({
        by: ['type'],
        _count: {
            id: true
        }
    });
    console.log("Branch types:", branches);

    const atms = await prisma.atm.count();
    console.log("Total ATMs:", atms);

    const staff = await prisma.user.count();
    console.log("Total Staff:", staff);

    // Get latest business snapshots to see what we can show
    const recentSnaps = await prisma.snapshot.findMany({
        orderBy: { date: 'desc' },
        take: 10,
        include: { parameter: true }
    });
    console.log("Recent Business Snapshots:", recentSnaps.map(s => ({ code: s.parameter?.code, unit: s.parameter?.unit, val: s.value })));
}

checkDb().catch(console.error).finally(() => prisma.$disconnect());
