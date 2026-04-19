import prisma from '../src/lib/prisma';

async function check() {
    try {
        const params = await prisma.misParameterRegistry.findMany();
        console.log('Total parameters:', params.length);
        
        const counts = await prisma.budgetMaster.groupBy({
            by: ['parameterName'],
            _count: { parameterName: true }
        });
        console.log('BudgetMaster counts length:', counts.length);
        
        // Check for null parameterName in BudgetMaster
        const nullCount = await prisma.budgetMaster.count({ where: { parameterName: null } });
        console.log('BudgetMaster rows with null parameterName:', nullCount);

    } catch (e) {
        console.error('Error during data check:', e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
