const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    console.log('--- DB Diagnostic ---');
    const calendar = await prisma.calendarMaster.aggregate({
        _min: { calDate: true },
        _max: { calDate: true },
        _count: { calDate: true }
    });
    console.log('Calendar range:', calendar);

    const factCount = await prisma.fact.count();
    console.log('Total facts:', factCount);

    const latestOpening = await prisma.accountOpening.findFirst({
        orderBy: { createdAt: 'desc' }
    });
    console.log('Latest account opening record:', latestOpening);
}
main().catch(console.error).finally(() => prisma.$disconnect());
