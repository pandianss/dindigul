const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();
async function main() {
    try {
        const c = await prisma.calendarMaster.count();
        const a = await prisma.accountOpening.count();
        const f = await prisma.fact.count();
        console.log(`Counts - Calendar: ${c}, AccountOpening: ${a}, Fact: ${f}`);
        
        const latestCal = await prisma.calendarMaster.findFirst({ orderBy: { calDate: 'desc' } });
        console.log(`Latest Calendar Date: ${latestCal?.calDate}`);
        
        const sampleAcc = await prisma.accountOpening.findFirst({ orderBy: { createdAt: 'desc' } });
        console.log(`Latest Account Opening: ${JSON.stringify(sampleAcc)}`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
