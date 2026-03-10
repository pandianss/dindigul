import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Inspecting MIS Data Units ---');

    const logs = await prisma.misImportLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    console.log('Latest Import Logs:');
    logs.forEach(log => {
        console.log(`ID: ${log.id}, Date: ${log.createdAt.toISOString()}, Filename: ${log.filename}, Dates in file: ${log.uniqueDates}`);
    });

    const dates = ['2026-03-08', '2026-03-09'];
    for (const d of dates) {
        const businessDate = new Date(Date.UTC(2026, 2, parseInt(d.split('-')[2])));
        const sampleFact = await prisma.fact.findFirst({
            where: { date: businessDate, metric: 'Adv' },
            include: { unit: true }
        });
        if (sampleFact) {
            console.log(`Sample Fact for ${d}: Unit=${sampleFact.unit.code}, Metric=Adv, Value=${sampleFact.value}`);
        } else {
             console.log(`No Adv fact found for ${d}`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
