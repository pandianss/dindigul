import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function check() {
    try {
        const csvPath = path.join(__dirname, '../../Budget2.csv');
        const csv = fs.readFileSync(csvPath, 'utf-8');

        const lines = csv.split('\n');
        const headers = lines[0].split(',');
        const solIdx = headers.indexOf('SOL');

        if (solIdx === -1) {
            console.error('SOL column not found');
            process.exit(1);
        }

        const csvSols = new Set<string>();
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Basic CSV splitting (handling quotes if any, but Budget2.csv looks simple)
            const cols = line.split(',');
            if (cols[solIdx]) {
                const sol = cols[solIdx].replace(/"/g, '').trim();
                if (sol && sol !== 'SOL') csvSols.add(sol);
            }
        }

        const dbBranches = await prisma.branch.findMany({
            select: { code: true }
        });
        const dbSols = new Set(dbBranches.map(b => b.code));

        const missing = [...csvSols].filter(s => !dbSols.has(s));
        console.log('--- SOL Comparison Results ---');
        console.log('Total SOLs in CSV:', csvSols.size);
        console.log('Total Branches in DB:', dbSols.size);
        console.log('Missing SOLs count:', missing.length);
        console.log('Missing SOLs:', missing.sort());
    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

check();
