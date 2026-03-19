import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const filename = '20260308.xlsx';
    console.log(`--- Investigating Ingestion Failure for ${filename} ---`);
    
    const log = await prisma.misImportLog.findFirst({
        where: { filename },
        orderBy: { createdAt: 'desc' }
    });

    if (!log) return;

    const ingestionLogs = await prisma.ingestionLog.findMany({
        where: { importLogId: log.id },
        include: { branch: true },
        orderBy: { createdAt: 'asc' }
    });

    console.log(`Total units logged: ${ingestionLogs.length}`);
    ingestionLogs.forEach((l, i) => {
        console.log(`${i+1}. SOL: ${l.branch.code} - ${l.branch.nameEn}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
