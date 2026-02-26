import fs from 'fs';
import path from 'path';
import { MISIngestionService } from './src/services/MISIngestionService';

async function seed() {
    const sampleDir = 'C:\\Users\\63039\\Videos\\Projects\\dindigul\\mis_sample_files';
    const files = fs.readdirSync(sampleDir).filter(f => f.endsWith('.xlsx'));

    console.log(`🚀 Starting MIS Seeding for ${files.length} files...`);

    for (const file of files) {
        const filePath = path.join(sampleDir, file);
        console.log(`📦 Processing ${file}...`);
        try {
            const result = await MISIngestionService.processExcel(filePath, file);
            console.log(`✅ Success: Processed ${result.processedCount} rows across ${result.uniqueUnits} units.`);
        } catch (err) {
            console.error(`❌ Failed to process ${file}:`, err);
        }
    }

    console.log('🏁 Seeding Complete.');
}

seed().catch(console.error);
