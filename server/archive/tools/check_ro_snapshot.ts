import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const branches = await prisma.branch.findMany({
        select: { id: true, code: true, type: true, nameEn: true }
    });

    console.log(`Checking RO (SOL 3933)...`);
    const ro = branches.find(b => b.code === '3933');
    if (ro) {
        console.log(`- ID: ${ro.id}, Name: ${ro.nameEn}, Type: ${ro.type}`);

        const snapshots = await prisma.misSnapshot.findMany({
            where: { unitId: ro.id },
            orderBy: { businessDate: 'desc' },
            take: 5
        });
        console.log(`- Snapshots for RO: ${snapshots.length}`);
        snapshots.forEach(s => {
            console.log(`  - Date: ${s.businessDate.toISOString()}, Status: ${s.status}`);
        });
    } else {
        console.log(`- RO branch '3933' NOT FOUND!`);
    }

    const nonRoBranches = branches.filter(b => b.type !== 'REGIONAL OFFICE');
    console.log(`Total Non-RO Branches: ${nonRoBranches.length}`);

    const dateStr = '2026-03-09';
    const [y, m, d] = dateStr.split('-').map(Number);
    const businessDate = new Date(Date.UTC(y, m - 1, d));

    const snapshotsOnDate = await prisma.misSnapshot.findMany({
        where: { businessDate },
        include: { branch: true }
    });
    console.log(`Snapshots on ${dateStr}: ${snapshotsOnDate.length}`);

    const snapBranches = snapshotsOnDate.map(s => s.branch?.code);
    console.log(`Snapshots found for branches: ${snapBranches.join(', ')}`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
