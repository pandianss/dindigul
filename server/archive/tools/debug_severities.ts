
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debug() {
    const date = '2026-02-26'; // Assuming this is the date from the screenshot context
    const [y, m, d] = date.split('-').map(Number);
    const businessDate = new Date(Date.UTC(y, m - 1, d));

    console.log(`Checking exceptions for ${businessDate.toISOString()}...`);

    const exceptions = await prisma.misException.findMany({
        where: { businessDate }
    });

    console.log(`Total exceptions found: ${exceptions.length}`);

    const severityCounts: Record<string, number> = {};
    exceptions.forEach(ex => {
        severityCounts[ex.severity] = (severityCounts[ex.severity] || 0) + 1;
    });

    console.log('Severity distribution:');
    console.log(JSON.stringify(severityCounts, null, 2));

    await prisma.$disconnect();
}

debug();
