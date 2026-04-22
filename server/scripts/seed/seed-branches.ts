import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Branch data seed...');

    const csvPath = path.resolve(__dirname, '../../branches.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');

    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    console.log(`Parsed ${records.length} records from branches.csv.`);

    let count = 0;
    for (const record of records as any[]) {
        const solCode = record['SOL'].padStart(4, '0');
        const nameEn = record['Branch'];
        const populationGroup = record['Category'] === 'SEMI URBAN' ? 'SEMI_URBAN' : (record['Category'] || 'URBAN');
        const type = record['Type']?.toUpperCase() || 'BRANCH';

        await prisma.branch.upsert({
            where: { code: solCode },
            update: {
                nameEn,
                populationGroup,
                type: type === 'BRANCH' ? 'BRANCH' : (type === 'RO' ? 'RO' : 'BRANCH')
            },
            create: {
                code: solCode,
                nameEn,
                populationGroup,
                type: type === 'BRANCH' ? 'BRANCH' : (type === 'RO' ? 'RO' : 'BRANCH'),
                officeId: parseInt(solCode) || 0
            }
        });
        count++;
    }

    console.log(`Successfully seeded ${count} branches.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
