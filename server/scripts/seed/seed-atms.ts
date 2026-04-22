import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting ATM data seed...');

    // The CSV is located in the root project folder
    const csvPath = path.resolve(__dirname, '../../ATM.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');

    // Parse CSV
    // The header line is: SLNO,RO NAME,BR CODE,BR NAME,ATM ID,LAST TXT DT,DENOM TRAY1,NO OF NOTES,DENOM TRAY2,NO OF NOTES,DENOM TRAY3,NO OF NOTES,DENOM TRAY4,NO OF NOTES,TOTAL CASH AVAILABLE
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    console.log(`Parsed ${records.length} records from CSV.`);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const record of records as any[]) {
        const branchCode = String(record['BR CODE']).padStart(4, '0');
        const atmId = record['ATM ID'];
        const lastTxnTime = record['LAST TXT DT'];
        const balance = parseFloat(record['TOTAL CASH AVAILABLE']) || 0;

        if (!branchCode || !atmId) {
            console.warn(`Skipping invalid record: ${JSON.stringify(record)}`);
            skippedCount++;
            continue;
        }

        // Find the branch
        const branch = await prisma.branch.findUnique({
            where: { code: branchCode },
        });

        if (!branch) {
            console.warn(`Branch not found for code ${branchCode}. Skipping ATM ${atmId}.`);
            skippedCount++;
            continue;
        }

        // Upsert the ATM record
        await prisma.atm.upsert({
            where: { atmId },
            update: {
                lastTxnTime,
                balance,
                branchId: branch.id,
            },
            create: {
                atmId,
                lastTxnTime,
                balance,
                branchId: branch.id,
            }
        });

        insertedCount++;
    }

    console.log(`\nSeed Complete!`);
    console.log(`Successfully processed / upserted ${insertedCount} ATMs.`);
    if (skippedCount > 0) {
        console.log(`Skipped ${skippedCount} ATMs (either missing branch or invalid data).`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
