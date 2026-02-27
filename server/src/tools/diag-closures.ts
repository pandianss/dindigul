import { PrismaClient } from '@prisma/client';
import { parseCSV } from '../utils/csv';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface AccountClosureCSVRow {
    SOL_ID: string;
    CIF_ID: string;
    FORACID: string;
    ACCT_NAME: string;
    ACCT_OPN_DATE: string;
    ACCT_CLS_DATE: string;
    SCHM_TYPE: string;
    SCHM_CODE: string;
    'Balance Prior to Closure': string;
}

async function diagnose() {
    console.log('--- Closure Data Diagnostics ---');
    const csvPath = path.join(__dirname, '../../closure.csv');

    if (!fs.existsSync(csvPath)) {
        console.error('closure.csv not found at:', csvPath);
        return;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    let records: AccountClosureCSVRow[] = [];

    try {
        records = parseCSV<AccountClosureCSVRow>(csvContent);
        console.log(`Parsed ${records.length} records.`);
    } catch (err: any) {
        console.error('CSV Parsing failed:', err.message);
        return;
    }

    // 1. Check for missing critical fields
    const missingFields = records.filter(r => !r.FORACID || !r.SOL_ID);
    if (missingFields.length > 0) {
        console.warn(`Found ${missingFields.length} records with missing FORACID or SOL_ID.`);
    }

    // 2. Check for duplicate FORACIDs
    const foracidCounts: Record<string, number> = {};
    const duplicates: string[] = [];
    records.forEach(r => {
        if (r.FORACID) {
            foracidCounts[r.FORACID] = (foracidCounts[r.FORACID] || 0) + 1;
            if (foracidCounts[r.FORACID] === 2) {
                duplicates.push(r.FORACID);
            }
        }
    });

    if (duplicates.length > 0) {
        console.warn(`Found ${duplicates.length} duplicate FORACIDs. First few:`, duplicates.slice(0, 5));
    } else {
        console.log('No duplicate FORACIDs found.');
    }

    // 3. Check for non-existent SOL_IDs
    const uniqueSolIds = Array.from(new Set(records.map(r => {
        let sol = (r.SOL_ID || '').toString().trim();
        if (sol.length > 0 && sol.length < 4) sol = sol.padStart(4, '0');
        return sol;
    }).filter(s => s)));

    console.log(`Checking ${uniqueSolIds.length} unique SOL_IDs against database...`);
    const existingBranches = await prisma.branch.findMany({
        where: { code: { in: uniqueSolIds } },
        select: { code: true }
    });
    const existingCodes = new Set(existingBranches.map(b => b.code));

    const missingSolIds = uniqueSolIds.filter(code => !existingCodes.has(code));
    if (missingSolIds.length > 0) {
        console.error(`ERROR: ${missingSolIds.length} SOL_IDs do not exist in the Branch table:`, missingSolIds);
    } else {
        console.log('All SOL_IDs exist in the Branch table.');
    }

    await prisma.$disconnect();
}

diagnose().catch(err => {
    console.error('Diagnostic script failed:', err);
    process.exit(1);
});
