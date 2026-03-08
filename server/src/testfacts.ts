import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const latest = await prisma.fact.findFirst({ orderBy: { date: 'desc' } });
    if (!latest) { console.log('No facts'); return; }
    const aggs = await prisma.fact.groupBy({
        by: ['metric'],
        _sum: { value: true },
        where: { date: latest.date }
    });
    console.log(aggs);

    // Also get the previous FY start and end for growth?
}
run().catch(console.error).finally(() => prisma.$disconnect());
