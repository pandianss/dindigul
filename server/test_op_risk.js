const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOpRisk() {
    const params = await prisma.misParameterRegistry.findMany({
        where: { category: 'Key Business Parameters' }
    });
    console.log("Categories with 'Key Business Parameters':", params.map(p => p.parameterName));

    const allParams = await prisma.misParameterRegistry.findMany({});
    console.log("All Unique Categories:", [...new Set(allParams.map(p => p.category))]);

    // Check exceptions for 17-03-2026
    const targetDate = new Date('2026-03-17T00:00:00.000Z');
    
    // Use a range to be safe against any time-of-day offsets
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const exceptions = await prisma.misException.findMany({
        where: { businessDate: { gte: startOfDay, lte: endOfDay } }
    });

    console.log(`Exceptions on 17-03-2026: ${exceptions.length}`);
    if (exceptions.length > 0) {
        console.table(exceptions.slice(0, 5).map(e => ({
            param: e.parameter, severity: e.severity, type: e.type, msg: e.message
        })));
    }

    // Let's check if there SHOULD be exceptions!
    const snaps = await prisma.misInformationPanel.findMany({
        where: {
            snapshot: { businessDate: { gte: startOfDay, lte: endOfDay } }
        },
        include: { snapshot: { include: { branch: true } } }
    });

    let foundCandidates = 0;
    for (const snap of snaps) {
        const paramStr = snap.parameter;
        const meta = allParams.find(p => p.parameterName === paramStr);
        if (meta?.category === 'Key Business Parameters' || meta?.category === 'Key_Business_Parameters') {
            const prevVal = Math.abs(Number(snap.val_y_eod || 0));
            const currentSwing = Math.abs(Number(snap.growth_day || 0));
            if (prevVal > 0 && (currentSwing / prevVal) > 0.1) {
                console.log(`Candidate! Branch: ${snap.snapshot.branch.nameEn}, Param: ${paramStr}, Prev: ${prevVal}, Swing: ${currentSwing}, Pct: ${(currentSwing/prevVal*100).toFixed(1)}%`);
                foundCandidates++;
            }
        }
    }
    console.log(`Found ${foundCandidates} candidates that should have triggered >10% growth rule.`);
}

testOpRisk().catch(console.error).finally(() => prisma.$disconnect());
