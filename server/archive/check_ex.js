const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEx() {
    const exs = await prisma.misException.findMany({
        where: { businessDate: new Date('2026-03-17T00:00:00.000Z') }
    });
    console.table(exs.map(e => ({
        id: e.id,
        severity: e.severity,
        status: e.status,
        parameter: e.parameter,
        type: e.type,
        msg: e.message
    })));
}

checkEx().catch(console.error).finally(() => prisma.$disconnect());
