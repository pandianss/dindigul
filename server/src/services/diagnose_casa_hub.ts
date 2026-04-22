import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function diagnose() {
    console.log('--- CASA Hub Diagnostic ---');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    console.log(`Current Date: ${today.toISOString()}`);
    
    // 1. Calendar Check
    const cal = await prisma.calendarMaster.findUnique({ where: { calDate: today } });
    console.log('Calendar Entry for Today:', cal ? 'FOUND' : 'MISSING');
    if (cal) {
        console.log(`  MonthKey: ${cal.monthKey}`);
        console.log(`  FinancialPeriod: ${cal.financialPeriod}`);
    }

    // 2. Config Check
    const configs = await prisma.systemConfig.findMany({
        where: { group: 'PLANNING' }
    });
    console.log('Planning Configs Found:', configs.length);
    configs.forEach((c: any) => {
        console.log(`  ${c.key}: ${c.value}`);
        if (c.key === 'PRODUCT_ADOPTION_SCHEMES') {
            try {
                JSON.parse(c.value);
                console.log('    JSON Validation: OK');
            } catch (e: any) {
                console.log(`    JSON Validation: FAILED - ${e.message}`);
            }
        }
    });

    // 3. Fact Table Check
    const factCount = await prisma.fact.count({
        where: { metric: { startsWith: 'PLAN_' } }
    });
    console.log('Planning Facts Count:', factCount);
    
    const latestFacts = await prisma.fact.findMany({
        where: { metric: { startsWith: 'PLAN_' } },
        orderBy: { date: 'desc' },
        take: 5
    });
    console.log('Latest Planning Facts:', latestFacts.map((f: any) => `${f.metric} on ${f.date.toISOString()} = ${f.value}`).join('\n  '));

    // 4. Test getAnalytics dependencies logic
    try {
        const bDate = today;
        const lastMonthKey = new Date(bDate.getFullYear(), bDate.getMonth() - 1, 1).toISOString().substring(0, 7);
        const lmDates = await prisma.calendarMaster.aggregate({
            where: { monthKey: lastMonthKey },
            _min: { calDate: true },
            _max: { calDate: true }
        });
        console.log('Last Month Boundaries:', lmDates._min.calDate ? 'OK' : 'MISSING');

        const currentMonthDates = await prisma.calendarMaster.aggregate({
            where: { monthKey: cal?.monthKey || '' },
            _min: { calDate: true }
        });
        console.log('Current Month Boundaries:', currentMonthDates._min.calDate ? 'OK' : 'MISSING');
    } catch (e: any) {
        console.log('Logic Test Failed:', e.message);
    }

    console.log('--- End Diagnostic ---');
}

diagnose()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
