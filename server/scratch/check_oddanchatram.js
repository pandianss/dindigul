const path = require('path');
const { PrismaClient } = require('../src/generated/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const branch = await prisma.branch.findFirst({
            where: { nameEn: { contains: 'Oddanchatram', mode: 'insensitive' } }
        });
        if (!branch) {
            console.log('Branch not found');
            return;
        }
        console.log('Branch:', JSON.stringify(branch, null, 2));

        const latestSnapshot = await prisma.misSnapshot.findFirst({
            where: { unitId: branch.id },
            orderBy: { businessDate: 'desc' },
            include: { panelData: true, exceptions: true }
        });
        
        if (latestSnapshot) {
            console.log('Latest Snapshot Date:', latestSnapshot.businessDate);
            console.log('Exception Count:', latestSnapshot.exceptions.length);
            console.log('Exceptions:', JSON.stringify(latestSnapshot.exceptions, null, 2));
            
            const kbp = latestSnapshot.panelData.filter(p => ['SB', 'CD', 'CASA', 'TD', 'TOTAL_DEPOSITS', 'ADV', 'BUSINESS'].includes(p.parameter.toUpperCase()));
            console.log('KBP Data:', JSON.stringify(kbp, null, 2));
        } else {
            console.log('No snapshot found for branch');
        }

        const latestFacts = await prisma.fact.findMany({
            where: { unitId: branch.id },
            orderBy: { date: 'desc' },
            take: 20
        });
        console.log('Latest Facts:', JSON.stringify(latestFacts, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
