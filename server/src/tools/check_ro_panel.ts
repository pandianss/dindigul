import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const ro = await prisma.branch.findUnique({ where: { code: '3933' } });
    if (!ro) { console.log('RO not found'); return; }

    const dateStr = '2026-03-09';
    const [y, m, d] = dateStr.split('-').map(Number);
    const businessDate = new Date(Date.UTC(y, m - 1, d));

    const snapshot = await prisma.misSnapshot.findUnique({
        where: { unitId_businessDate_version: { unitId: ro.id, businessDate, version: 1 } },
        include: { panelData: true }
    });

    if (snapshot) {
        console.log(`Snapshot for RO (${ro.code}) exists on ${dateStr}`);
        console.log(`- Panel Data Count: ${snapshot.panelData.length}`);
    } else {
        console.log(`Snapshot for RO (${ro.code}) MISSING on ${dateStr}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
