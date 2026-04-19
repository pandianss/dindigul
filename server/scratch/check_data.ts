import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDataAvailability() {
    const dates = ['2026-04-14', '2026-04-15'];
    
    for (const dStr of dates) {
        const [y, m, d] = dStr.split('-').map(Number);
        const date = new Date(Date.UTC(y, m - 1, d));
        
        const snapCount = await prisma.misSnapshot.count({ where: { businessDate: date } });
        const factCount = await prisma.fact.count({ where: { date: date } });
        
        console.log(`Date: ${dStr} | Snapshots: ${snapCount} | Facts: ${factCount}`);
    }

    await prisma.$disconnect();
}

checkDataAvailability();
