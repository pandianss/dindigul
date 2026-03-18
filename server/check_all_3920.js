const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAll3920() {
    const facts = await prisma.fact.findMany({
        where: { 
            branch: { code: '3920' },
            date: { in: [new Date('2026-03-09T00:00:00Z'), new Date('2026-03-16T00:00:00Z'), new Date('2026-03-17T00:00:00Z')] }
        }
    });

    const dict = {};
    for (const f of facts) {
        const d = f.date.toISOString().split('T')[0];
        if (!dict[d]) dict[d] = {};
        dict[d][f.metric] = f.value;
    }

    const metrics = [...new Set(facts.map(f => f.metric))].sort();
    
    console.log("Values by Date:");
    console.log("Metric\t\t09.03\t\t16.03\t\t17.03");
    console.log("-".repeat(60));
    for (const m of metrics) {
        const v1 = dict['2026-03-09']?.[m]?.toString() || 'N/A';
        const v2 = dict['2026-03-16']?.[m]?.toString() || 'N/A';
        const v3 = dict['2026-03-17']?.[m]?.toString() || 'N/A';
        console.log(`${m.padEnd(15)}\t${v1.padEnd(10)}\t${v2.padEnd(10)}\t${v3.padEnd(10)}`);
    }
}

checkAll3920().catch(console.error).finally(() => prisma.$disconnect());
