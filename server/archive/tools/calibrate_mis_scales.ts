import prisma from '../../src/lib/prisma';

async function main() {
    console.log('Starting MIS Data Scaling Calibration (Lakhs -> Crores)...');
    
    // We target dates on or before Feb 28, 2026.
    // March 2026 data was already scaled correctly by the updated MISIngestionService.
    const cutoffDate = new Date(Date.UTC(2026, 2, 1)); // March 1, 2026

    const branches = await prisma.branch.findMany({
        where: { type: 'BRANCH' }
    });
    const branchIds = branches.map(b => b.id);

    console.log(`Found ${branchIds.length} branches to calibrate.`);

    // Divide branch facts for March 16/17 by 100 (they were missed).
    // Historical data and RO data are already in Crores now.
    const result = await prisma.$executeRaw`
        UPDATE public.mis_facts
        SET value = value / 100
        WHERE metric NOT IN ('CASA%', 'CD_Ratio')
        AND date >= ${cutoffDate}
        AND "unitId" IN (SELECT id FROM public.branches WHERE type = 'BRANCH')
    `;

    console.log(`Successfully calibrated ${result} fact records.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
