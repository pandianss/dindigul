import { PrismaClient } from '@prisma/client';
import { MISIngestionService } from './src/services/MISIngestionService';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Attempting to Delete Stuck Import ---');
    try {
        const stuckImport = await prisma.misImportLog.findFirst({
            where: { status: 'PROCESSING', filename: '20260308.xlsx' }
        });

        if (!stuckImport) {
            console.log('No stuck import found for 20260308.xlsx.');
            return;
        }

        console.log(`Found stuck import ID: ${stuckImport.id}`);
        
        await MISIngestionService.deleteImport(stuckImport.id);
        console.log('✅ Deletion successful via MISIngestionService.');

    } catch (error: any) {
        console.error('❌ Deletion failed with error:');
        console.error(error);
        if (error.code) console.error('Prisma Error Code:', error.code);
        if (error.meta) console.error('Prisma Error Meta:', error.meta);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
