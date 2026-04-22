import fs from 'fs';
import path from 'path';
import { AccountAnalyticsService } from './src/services/accountAnalyticsService';
import prisma from './src/lib/prisma';

async function main() {
    const csvPath = path.resolve(__dirname, '../Dindigul Region.csv');
    console.log(`Reading CSV from: ${csvPath}`);
    
    if (!fs.existsSync(csvPath)) {
        console.error("CSV file not found!");
        process.exit(1);
    }
    
    const csvBuffer = fs.readFileSync(csvPath);
    // Assuming CSV is utf-8
    const csvContent = csvBuffer.toString('utf-8');
    
    // We assume the business date for ingestion is the one currently driving reports
    // For safety, let's use the current date or standard date
    const businessDate = new Date(); 
    
    console.log("Starting CSV processing...");
    const results = await AccountAnalyticsService.processAccountOpenings(csvContent, businessDate);
    
    console.log("Processing Results:", JSON.stringify(results, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
