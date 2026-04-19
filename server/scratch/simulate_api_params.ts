import prisma from '../src/lib/prisma';

async function check() {
    try {
        console.log('Fetching parameters with math logic from parameterRoutes...');
        
        const parameters = await prisma.misParameterRegistry.findMany({
            include: {
                parentParameter: {
                    select: {
                        displayName: true,
                        parameterName: true
                    }
                }
            },
            orderBy: [
                { category: 'asc' },
                { orderIndex: 'asc' },
                { parameterName: 'asc' }
            ]
        });

        console.log('Fetched parameters count:', parameters.length);

        const counts = await prisma.budgetMaster.groupBy({
            by: ['parameterName'],
            _count: { parameterName: true }
        });

        console.log('BudgetMaster counts length:', counts.length);

        const countMap = Object.fromEntries(counts.map(c => [c.parameterName, c._count.parameterName]));

        const results = parameters.map(p => ({
            ...p,
            budgetCount: countMap[p.parameterName] || 0
        }));

        console.log('Results mapped successfully. First 2 results:', JSON.stringify(results.slice(0, 2), null, 2));

    } catch (e) {
        console.error('API Simulation Failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
