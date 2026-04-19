const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const results = await prisma.accountOpening.groupBy({
            by: ['schmType'],
            where: { solId: '1258' },
            _count: { foracid: true }
        });
        console.log('CHART_DATA_START');
        console.log(JSON.stringify(results));
        console.log('CHART_DATA_END');
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
