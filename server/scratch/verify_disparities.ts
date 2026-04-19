import prisma from '../src/lib/prisma';
import { getDailyMovement } from '../src/services/letterCriteriaService';

async function verify() {
    try {
        const branch = await prisma.branch.findFirst({
            where: { nameEn: { contains: 'Oddanchatram', mode: 'insensitive' } }
        });
        if (!branch) return;

        const businessDate = new Date(Date.UTC(2026, 3, 14)); // 14.04.26
        const result = await getDailyMovement(branch.id, businessDate) as any;
        const movements = result.movements;
        
        console.log('Processed Movements for Oddanchatram on 14.04.26:');
        movements.forEach((m: any) => {
            console.log(`${m.parameter} (${m.metricKey}): ${m.latestValue}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
