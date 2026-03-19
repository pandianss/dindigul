const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkScale() {
    const branches = await prisma.branch.findMany({ where: { type: 'Branch' } });
    
    // Pick one branch to test our theory
    const b = branches.find(b => b.code === '3920');
    
    const budgets = await prisma.budgetMaster.findMany({
        where: { solId: b.code, parameterName: 'Total Dep', isActive: true }
    });
    console.log("BUDGETS for 3920 Total Dep:");
    console.table(budgets.map(b => ({ period: b.periodKey, target: b.targetValue })));
    
    const facts = await prisma.fact.findMany({
        where: { unitId: b.id, metric: 'Total Dep' }
    });
    console.log("FACTS for 3920 Total Dep:");
    console.table(facts.map(f => ({ date: f.date.toISOString().split('T')[0], value: f.value })));
    
    // Let's also check an impacted branch where Total Dep was > 150. E.g., Ambilikai (3549)
    const b2 = branches.find(b => b.code === '3549');
    const budgets2 = await prisma.budgetMaster.findMany({
        where: { solId: b2.code, parameterName: 'Total Dep', isActive: true }
    });
    console.log("BUDGETS for 3549 Total Dep:");
    console.table(budgets2.map(b => ({ period: b.periodKey, target: b.targetValue })));
    
    const facts2 = await prisma.fact.findMany({
        where: { unitId: b2.id, metric: 'Total Dep' }
    });
    console.log("FACTS for 3549 Total Dep:");
    console.table(facts2.map(f => ({ date: f.date.toISOString().split('T')[0], value: f.value })));
}

checkScale().catch(console.error).finally(() => prisma.$disconnect());
