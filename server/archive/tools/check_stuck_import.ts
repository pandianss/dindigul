import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Stuck Import Log ---');
    const log = await prisma.misImportLog.findFirst({
        where: { filename: '20260308.xlsx' },
        orderBy: { createdAt: 'desc' }
    });

    if (log) {
        console.log('Import Log Details:');
        console.log(JSON.stringify(log, null, 2));

        const ingestionLogs = await prisma.ingestionLog.findMany({
            where: { importLogId: log.id }
        });
        console.log(`Associated Ingestion Logs: ${ingestionLogs.length}`);
        
        if (ingestionLogs.length > 0) {
            console.log('Last few units processed:');
            ingestionLogs.slice(-5).forEach(l => console.log(`Unit UID: ${l.unitId}, Status: ${l.status}`));
        }
    } else {
        console.log('No import log found for 20260308.xlsx');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
