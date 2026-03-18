
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const targetMetrics = [
  'Total Dep', 'Adv', 'Bus', 'CASA', 'SB', 'CD', 'TD', 'Core Ret', 'Core Adv', 'Core_Agri', 
  'MSME', 'Mudra', 'Gold', 'HL', 'VL', 'OthRet', 'Mort', 'Liq', 'EL', 'PersonalLoan', 'NPA',
  'CASA%', 'CD_Ratio'
];

async function rectify() {
  console.log('--- Rectifying All Units (Budgets & Facts) to Crores ---');

  const branches = await prisma.branch.findMany({ where: { type: 'Branch' } });
  const branchIds = branches.map(b => b.id);
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b]));
  console.log(`Targeting ${branches.length} regular branches.`);

  const targetDate = new Date('2026-03-01');

  // 1. Normalize Facts (Lakhs to Cr) - Only if they look like Lakhs (> 100)
  const factsToFix = await prisma.fact.findMany({
    where: { unitId: { in: branchIds }, metric: { in: targetMetrics }, value: { gt: 100 }, date: { gte: targetDate } }
  });
  console.log(`Found ${factsToFix.length} facts in Lakhs to normalize.`);
  for (const f of factsToFix) {
    await prisma.fact.update({ where: { id: f.id }, data: { value: Number(f.value) / 100 } });
  }

  // 2. Clear snapshots for regeneration
  console.log('Clearing old snapshots...');
  await prisma.misInformationPanel.deleteMany({ where: { snapshot: { businessDate: { gte: targetDate } } } });
  await prisma.misException.deleteMany({ where: { businessDate: { gte: targetDate } } });
  await prisma.misSnapshot.deleteMany({ where: { businessDate: { gte: targetDate } } });

  // 3. Regenerate for March 16
  const bizDate = new Date(Date.UTC(2026, 2, 16));
  console.log(`Regenerating for ${bizDate.toISOString()}...`);

  // Temporal Setup
  const yesterday = new Date(bizDate); yesterday.setUTCDate(bizDate.getUTCDate() - 1);
  const pmEnd = new Date(Date.UTC(bizDate.getUTCFullYear(), bizDate.getUTCMonth(), 0));
  const fyYear = bizDate.getUTCMonth() < 3 ? bizDate.getUTCFullYear() - 1 : bizDate.getUTCFullYear();
  const fyStart = new Date(Date.UTC(fyYear, 2, 31));
  const allDates = [bizDate, yesterday, pmEnd, fyStart];

  const facts = await prisma.fact.findMany({ where: { unitId: { in: branchIds }, date: { in: allDates } } });
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const getPeriodKey = (d) => `${months[d.getUTCMonth()]}-${d.getUTCFullYear().toString().slice(-2)}`;
  const currMonthKey = getPeriodKey(bizDate);
  const budgets = await prisma.budgetMaster.findMany({
    where: { solId: { in: branches.map(b => b.code) }, periodKey: currMonthKey, isActive: true }
  });

  const panelData = [];
  for (const b of branches) {
    const s = await prisma.misSnapshot.create({ data: { unitId: b.id, businessDate: bizDate, status: 'PROVISIONAL' } });
    const bFacts = facts.filter(f => f.unitId === b.id);
    const bBudgets = budgets.filter(bu => bu.solId === b.code);

    const getVal = (m, d) => {
      const f = bFacts.find(fact => fact.metric === m && fact.date.getTime() === d.getTime());
      return f ? Number(f.value) : 0;
    };

    const getBud = (m) => {
      const bRec = bBudgets.find(bu => bu.parameterName === m);
      const val = bRec ? Number(bRec.targetValue) : 0;
      const isRatio = m.includes('%') || m.toLowerCase().includes('ratio');
      return isRatio ? val : val / 100; // Normalize Lakhs to Cr
    };

    const metricsToGenerate = ['Total Dep', 'Adv', 'Bus', 'CASA', 'SB', 'CD', 'TD', 'NPA'];
    for (const m of metricsToGenerate) {
      const current = getVal(m, bizDate);
      const yest = getVal(m, yesterday);
      const pM = getVal(m, pmEnd);
      const fyS = getVal(m, fyStart);
      const bud = getBud(m);

      panelData.push({
        snapshotId: s.id,
        parameter: m,
        val_current: current,
        val_y_eod: yest,
        val_prev_m_end: pM,
        val_fy_start: fyS,
        budget_month: bud,
        gap_month: current - bud,
        growth_day: current - yest,
        growth_month: current - pM,
        growth_fy: current - fyS,
        status: (bud > 0 ? (current >= bud ? 'Surpassed' : 'Behind') : (current >= yest ? 'On-Track' : 'Behind'))
      });
    }
  }

  await prisma.misInformationPanel.createMany({ data: panelData });
  console.log(`Created ${panelData.length} panel records.`);
  console.log('Rectification Complete.');
}

rectify().catch(console.error).finally(() => prisma.$disconnect());
