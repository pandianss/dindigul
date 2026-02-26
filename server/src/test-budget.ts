import { BudgetService } from './services/budgetService';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
    console.log('--- Testing Budget Ingestion ---');
    const csvPath = path.join(__dirname, '../../Budget2.csv');
    if (!fs.existsSync(csvPath)) {
        console.error('Budget2.csv not found at', csvPath);
        process.exit(1);
    }
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    try {
        console.log('Starting first-time ingestion...');
        const results = await BudgetService.processBudgets(csvContent, 'test-user', 'Budget2.csv');
        console.log('Results:', results);

        const masterCount = await prisma.budgetMaster.count();
        const historyCount = await prisma.budgetHistory.count();
        const registryCount = await prisma.misParameterRegistry.count();

        console.log('--- Stats After 1st Run ---');
        console.log('BudgetMaster rows:', masterCount);
        console.log('BudgetHistory rows:', historyCount);
        console.log('ParameterRegistry size:', registryCount);

        const sample = await prisma.budgetMaster.findFirst({
            where: { parameterName: 'Agri_JL', solId: '0174', periodKey: 'Mar-25' }
        });
        console.log('Sample Budget (Agri_JL/0174/Mar-25):', sample);

        // Test Re-upload (should not increment version if values same)
        console.log('\nStarting re-upload with same values...');
        const results2 = await BudgetService.processBudgets(csvContent, 'test-user', 'Budget2.csv');
        console.log('Results 2:', results2);

        const masterCount2 = await prisma.budgetMaster.count();
        const historyCount2 = await prisma.budgetHistory.count();
        console.log('Stats After same-value re-upload (expect same):', masterCount2, historyCount2);

        // Test modification
        console.log('\nTesting modification logic...');
        // Manually change one value in DB to trigger update
        if (sample) {
            await prisma.budgetMaster.update({
                where: { id: sample.id },
                data: { targetValue: 999999 } // Mock change
            });
            console.log('Modified sample value to 999999 in DB.');

            console.log('Re-uploading CSV (should revert and archive)...');
            await BudgetService.processBudgets(csvContent, 'test-user', 'Budget2.csv');

            const reverted = await prisma.budgetMaster.findUnique({ where: { id: sample.id } });
            const history = await prisma.budgetHistory.findMany({
                where: { parameterName: 'Agri_JL', solId: '0174', periodKey: 'Mar-25' },
                orderBy: { changedAt: 'desc' }
            });

            console.log('Reverted value:', reverted?.targetValue);
            console.log('Version No:', reverted?.versionNo);
            console.log('History entries for this key:', history.length);
            console.log('Latest history entry change type:', history[0]?.changeType, 'value:', history[0]?.targetValue);
        }

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        process.exit(0);
    }
}

test();
