import { PrismaClient } from '@prisma/client';
import { RuleEngine } from '../services/RuleEngine';

const prisma = new PrismaClient();

async function testEngine() {
    const targetDate = new Date('2026-03-17T00:00:00.000Z');
    
    // Use a range to be safe against any time-of-day offsets
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const snaps = await prisma.misSnapshot.findMany({
        where: { businessDate: { gte: startOfDay, lte: endOfDay } },
        select: { id: true, unitId: true }
    });

    console.log(`Found ${snaps.length} snapshots for eval.`);
    await RuleEngine.evaluateBatch(snaps.map(s => s.id));
    
    const exCount = await prisma.misException.count({
        where: { businessDate: { gte: startOfDay, lte: endOfDay } }
    });
    console.log(`Generated ${exCount} exceptions total.`);
}

testEngine().catch(console.error).finally(() => prisma.$disconnect());
