
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        console.log('--- PARAMETERS ---');
        const params = await prisma.parameter.findMany({
            where: { code: { in: ['CASH_TOTAL', 'CASH_CRL', 'CASH_EXCESS', 'CD_RATIO'] } }
        });
        console.log(JSON.stringify(params, null, 2));

        console.log('--- MIS PANEL (Latest 5) ---');
        const mis = await prisma.misInformationPanel.findMany({
            where: { 
                OR: [
                    { parameter: { contains: 'Cash' } },
                    { parameter: { contains: 'CRL' } },
                    { parameter: { contains: 'CD' } }
                ]
            },
            include: { snapshot: true },
            orderBy: { id: 'desc' },
            take: 10
        });
        console.log(JSON.stringify(mis, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
