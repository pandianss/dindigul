import { dashboardService } from './src/services/dashboardService';
import prisma from './src/lib/prisma';

async function test() {
    try {
        console.log('Testing dashboardService.getConfig()...');
        const config = await dashboardService.getConfig();
        console.log('Success! Last updated:', config.lastUpdated);
        console.log('KPIs count:', config.kpis.length);
        console.log('Anniversaries count:', config.anniversaries.length);
    } catch (err: any) {
        console.error('FAILED TO FETCH DASHBOARD CONFIG:');
        console.error(err);
        if (err.stack) console.error(err.stack);
    } finally {
        await prisma.$disconnect();
    }
}

test();
