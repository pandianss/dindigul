import { PrismaClient } from '@prisma/client';
import { MISIngestionService } from '../src/services/MISIngestionService';

const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.misImportLog.findMany();
    console.log(`Found ${logs.length} import logs.`);
    if (logs.length > 0) {
        // try to delete the first one
        console.log(`Deleting log ${logs[0].id}`);
        try {
            await MISIngestionService.deleteImport(logs[0].id);
            console.log('Success!');
        } catch (err: any) {
            console.error('Failed:', err.message);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
