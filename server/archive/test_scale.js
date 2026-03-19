const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testScale() {
    const branches = await prisma.branch.findMany({ where: { type: 'Branch' } });
    const branchIds = branches.map(b => b.id);
    
    // 1. Get 17.03 facts as the benchmark scale (Crores)
    const facts17 = await prisma.fact.findMany({
        where: { date: new Date('2026-03-17T00:00:00.000Z'), unitId: { in: branchIds } }
    });
    
    const benchmark = {};
    for (const f of facts17) {
        if (!benchmark[f.unitId]) benchmark[f.unitId] = {};
        benchmark[f.unitId][f.metric] = Number(f.value);
    }
    
    // 2. Fetch all prior facts
    const factsPre17 = await prisma.fact.findMany({
        where: { date: { lt: new Date('2026-03-17T00:00:00.000Z') }, unitId: { in: branchIds } }
    });
    
    let needsDivision = 0;
    let needsMultiplication = 0;
    let ok = 0;
    const skips = ['Branch_PL', 'ProfitLoss', 'NPA', 'CD_Ratio', 'CASA%', 'YIELD_ADVANCES', 'COST_DEPOSITS'];

    for (const f of factsPre17) {
        if (skips.includes(f.metric)) continue;
        
        const val = Number(f.value);
        if (val === 0) { ok++; continue; }
        
        let trueScale = benchmark[f.unitId]?.[f.metric];
        if (!trueScale || trueScale === 0) {
            // Cannot confidently determine scale against 17.03. Leave alone.
            ok++; continue;
        }
        
        const ratio = val / trueScale;
        if (ratio > 10 && ratio < 1000) {
            needsDivision++;
        } else if (ratio < 0.1 && ratio > 0.001) {
            needsMultiplication++;
        } else {
            ok++;
        }
    }
    
    console.log(`Pre-17 Data Evaluation:
    OK (Crores / Untouched): ${ok}
    Needs Division (Lakhs -> Crores): ${needsDivision}
    Needs Multiplication: ${needsMultiplication}`);
}

testScale().catch(console.error).finally(() => prisma.$disconnect());
