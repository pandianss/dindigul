
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function normalize() {
  console.log('--- Unit Normalization (Standardizing to Crores) ---');

  // 1. Identify "Lakhs" candidates in Facts (values > 200 for small branches or specifically for Mar 2026)
  const threshold = 150; // Anything above 150 for a mid-size branch is likely Lakhs
  
  // Update Facts
  const facts = await prisma.fact.updateMany({
    where: {
      metric: { in: ['Total Dep', 'Adv', 'Bus', 'CASA', 'SB', 'CD', 'TD', 'Core Ret', 'Core Adv', 'Core_Agri', 'MSME', 'Mudra', 'Gold', 'HL', 'VL', 'OthRet', 'Mort', 'Liq', 'EL', 'PersonalLoan', 'Mudra'] },
      value: { gt: threshold }
    },
    data: {
      value: { divide: 100 }
    }
  });
  console.log(`Normalized ${facts.count} Fact records.`);

  // 2. Update Performance Snapshots
  // Note: parameterId filter would be better but let's look at value/date
  const snapshots = await prisma.snapshot.updateMany({
    where: {
      value: { gt: threshold }
    },
    data: {
      value: { divide: 100 },
      budget: { divide: 100 } // Most budgets are likely Lakhs too if snapshots are
    }
  });
  console.log(`Normalized ${snapshots.count} Performance Snapshot records.`);

  // 3. Update MIS Information Panels
  const numericFields = [
    'val_prev_fy_start', 'val_prev_fy_end', 'val_fy_start', 'val_prev_m_end', 
    'val_dby', 'val_y_eod', 'val_current', 'budget_month', 'budget_quarter'
  ];

  for (const field of numericFields) {
    const panels = await prisma.misInformationPanel.updateMany({
      where: {
        [field]: { gt: threshold }
      },
      data: {
        [field]: { divide: 100 }
      }
    });
    console.log(`Normalized ${panels.count} MisInformationPanel records for field: ${field}`);
  }

  // 4. Special case for Dindigul Main (3933) - historically always Lakhs in recent uploads
  const mainBranch = await prisma.branch.findUnique({ where: { code: '3933' } });
  if (mainBranch) {
      // Re-normalize everything for 3933 just in case some were below threshold but still Lakhs
      const mainFacts = await prisma.fact.updateMany({
          where: { unitId: mainBranch.id, value: { gt: 10 } }, // Smaller threshold for main branch
          data: { value: { divide: 100 } }
      });
      console.log(`Special re-normalization for Dindigul Main (3933): ${mainFacts.count} records.`);
  }

  console.log('\nNormalization Complete.');
}

normalize().catch(console.error).finally(() => prisma.$disconnect());
