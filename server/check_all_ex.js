const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllExceptions() {
    const total = await prisma.misException.count();
    console.log(`Total exceptions in DB: ${total}`);

    const byDate = await prisma.misException.groupBy({
        by: ['businessDate'],
        _count: { id: true }
    });
    console.log("Exceptions by date:");
    console.table(byDate.map(d => ({ date: d.businessDate, count: d._count.id })));
}

checkAllExceptions().catch(console.error).finally(() => prisma.$disconnect());
