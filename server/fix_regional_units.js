
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRegional() {
  console.log('--- Restoring Regional Office Units (Multiplying by 100) ---');

  // 1. Find the Regional Office units
  const regionalUnits = await prisma.branch.findMany({
    where: { type: 'REGIONAL OFFICE' },
    select: { id: true, nameEn: true, code: true }
  });

  const unitIds = regionalUnits.map(u => u.id);
  console.log(`Found ${regionalUnits.length} Regional Office units: ${regionalUnits.map(u => u.nameEn).join(', ')}`);

  if (unitIds.length === 0) {
    console.log('No regional offices found. Exiting.');
    return;
  }

  // 2. Multiply Facts by 100 for these units
  // We target only numeric metrics, excluding ratios and NPA (which might already be small)
  // Actually, for RO, even NPA is likely in Crores and was divided, so let's include it if it's too small.
  const targetMetrics = [
    'Total Dep', 'Adv', 'Bus', 'CASA', 'SB', 'CD', 'TD', 'Core Ret', 'Core Adv', 'Core_Agri', 
    'MSME', 'Mudra', 'Gold', 'HL', 'VL', 'OthRet', 'Mort', 'Liq', 'EL', 'PersonalLoan', 'NPA'
  ];

  const facts = await prisma.fact.updateMany({
    where: {
      unitId: { in: unitIds },
      metric: { in: targetMetrics },
      value: { lt: 50 }, // Only multiply if it was likely divided (RO values are typically > 100 Cr)
      date: { gte: new Date('2026-03-01') } // Target recent incorrect standardizations
    },
    data: {
      value: { multiply: 100 }
    }
  });
  console.log(`Restored ${facts.count} Fact records for Regional Offices.`);

  // 3. Update Performance Snapshots
  const snapshots = await prisma.snapshot.updateMany({
    where: {
      branchId: { in: unitIds },
      value: { lt: 50 },
      date: { gte: new Date('2026-03-01') }
    },
    data: {
      value: { multiply: 100 },
      budget: { multiply: 100 }
    }
  });
  console.log(`Restored ${snapshots.count} Performance Snapshot records.`);

  // 4. Update MIS Information Panels
  const numericFields = [
    'val_prev_fy_start', 'val_prev_fy_end', 'val_fy_start', 'val_prev_m_end', 
    'val_dby', 'val_y_eod', 'val_current', 'budget_month', 'budget_quarter', 'gap_month', 'gap_quarter'
  ];

  for (const field of numericFields) {
    const panels = await prisma.misInformationPanel.updateMany({
      where: {
        snapshot: { unitId: { in: unitIds }, businessDate: { gte: new Date('2026-03-01') } },
        [field]: { lt: 50, gt: -50 } // Handle negative gaps too
      },
      data: {
        [field]: { multiply: 100 }
      }
    });
    console.log(`Restored ${panels.count} MisInformationPanel records for field: ${field}`);
  }

  console.log('\nRestoration Complete.');
}

fixRegional().catch(console.error).finally(() => prisma.$disconnect());
