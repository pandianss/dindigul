import { MISIngestionService } from '../services/MISIngestionService';
import path from 'path';
import prisma from '../lib/prisma';

async function main() {
    console.log('Starting sequential ingestion of 6 MIS files...');
    const misFilesDir = 'C:\\Users\\63039\\Videos\\Projects\\dindigul\\mis_files';
    const files = [
        '20240331.xlsx',
        '20250331.xlsx',
        '20260228.xlsx',
        '20260304.xlsx',
        '20260305.xlsx',
        '20260308.xlsx'
    ];

    for (const filename of files) {
        const filePath = path.join(misFilesDir, filename);
        console.log(`\n--- Processing ${filename} ---`);
        try {
            const startTime = Date.now();
            const results = await MISIngestionService.processExcel(filePath, filename);
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`Successfully processed ${filename} in ${duration}s:`);
            console.log(` - Import ID: ${results.importId}`);
            console.log(` - Processed rows: ${results.processedCount}`);
            console.log(` - Failed rows: ${results.failedCount}`);
        } catch (error) {
            console.error(`Failed to process ${filename}:`, error);
        }
    }

    console.log('\nAll files processed.');
    await prisma.$disconnect();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
