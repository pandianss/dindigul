import prisma from '../src/lib/prisma';

async function check() {
    try {
        const branch = await prisma.branch.findFirst({
            where: { nameEn: { contains: 'Oddanchatram', mode: 'insensitive' } }
        });
        if (!branch) {
            console.log('Branch not found');
            return;
        }
        const businessDate = new Date(Date.UTC(2026, 3, 14)); // 14.04.26 (from screenshot)
        
        const facts = await prisma.fact.findMany({
            where: { unitId: branch.id, date: businessDate }
        });
        
        console.log('Facts for Oddanchatram on 14.04.26:');
        facts.forEach(f => {
            console.log(`${f.metric}: ${f.value}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
