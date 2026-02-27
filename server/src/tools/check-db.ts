import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    console.log('--- DB Check ---');
    const closureCount = await prisma.accountClosure.count();
    const openingCount = await prisma.accountOpening.count();
    console.log('Total closures:', closureCount);
    console.log('Total openings:', openingCount);

    const latestOpening = await prisma.accountOpening.findFirst({ orderBy: { acctOpnDate: 'desc' } });
    const earliestOpening = await prisma.accountOpening.findFirst({ orderBy: { acctOpnDate: 'asc' } });

    const latestClosure = await prisma.accountClosure.findFirst({ orderBy: { acctClsDate: 'desc' } });
    const earliestClosure = await prisma.accountClosure.findFirst({ orderBy: { acctClsDate: 'asc' } });

    console.log('Opening Date Range:', earliestOpening?.acctOpnDate, 'to', latestOpening?.acctOpnDate);
    console.log('Closure Date Range:', earliestClosure?.acctClsDate, 'to', latestClosure?.acctClsDate);

    const factSbCount = await prisma.factSbDailyBranch.count();
    console.log('FactSbDailyBranch count:', factSbCount);

    const sampleFactSb = await prisma.factSbDailyBranch.findFirst({
        where: { sbClosed: { gt: 0 } }
    });
    console.log('Sample FactSb with Closures > 0:', sampleFactSb);

    process.exit(0);
}

check().catch(console.error);
