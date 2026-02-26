import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const solId = '1401';

    const periods = [
        { name: 'Feb 2026', start: new Date('2026-02-01'), end: new Date('2026-02-28') },
        { name: 'Jan 2026', start: new Date('2026-01-01'), end: new Date('2026-01-31') },
        { name: 'FY 2025-26', start: new Date('2025-04-01'), end: new Date('2026-03-31') }
    ];

    for (const p of periods) {
        const openings = await prisma.accountOpening.count({
            where: { solId, acctOpnDate: { gte: p.start, lte: p.end } }
        });
        const closures = await prisma.accountClosure.count({
            where: { solId, acctClsDate: { gte: p.start, lte: p.end } }
        });
        console.log(`${p.name} - Openings: ${openings}, Closures: ${closures}`);
    }

    // Check fact table for these periods
    const factOpenings = await prisma.factSbDailyBranch.aggregate({
        where: { solId, openDay: { gte: new Date('2026-02-01'), lte: new Date('2026-02-28') } },
        _sum: { netSbOpened: true, sbClosed: true }
    });
    console.log('Fact table Feb 2026 sums:', factOpenings._sum);

    const factFYOpenings = await prisma.factSbDailyBranch.aggregate({
        where: { solId, openDay: { gte: new Date('2025-04-01'), lte: new Date('2026-03-31') } },
        _sum: { netSbOpened: true, sbClosed: true }
    });
    console.log('Fact table FY sums:', factFYOpenings._sum);

    process.exit(0);
}

check().catch(console.error);
