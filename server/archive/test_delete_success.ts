import { PrismaClient } from '@prisma/client';
import { MISIngestionService } from './src/services/MISIngestionService';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Attempting to Delete Success Import ---');
    try {
        const importLog = await prisma.misImportLog.findFirst({
            where: { filename: '20260305.xlsx' }
        });

        if (!importLog) {
            console.log('No import found for 20260305.xlsx.');
            return;
        }

        console.log(`Found import ID: ${importLog.id}`);
        
        await MISIngestionService.deleteImport(importLog.id);
        console.log('✅ Deletion successful via MISIngestionService.');

    } catch (error: any) {
        console.error('❌ Deletion failed with error:');
        console.error(error);
        if (error.code) console.error('Prisma Error Code:', error.code);
        if (error.meta) console.error('Prisma Error Meta:', error.meta);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
