
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  const branch = await prisma.branch.findFirst({
    where: { nameEn: { contains: 'VANGAMANUTHU', mode: 'insensitive' } }
  });

  if (!branch) {
    console.error('Branch not found');
    return;
  }

  const targetDate = new Date(Date.UTC(2026, 2, 16));
  
  // Find or create a snapshot for this date to link to
  let snapshot = await prisma.misSnapshot.findFirst({
    where: { unitId: branch.id, businessDate: targetDate }
  });

  if (!snapshot) {
      snapshot = await prisma.misSnapshot.create({
          data: {
              unitId: branch.id,
              businessDate: targetDate,
              type: 'DAILY'
          }
      });
  }

  // 1. Update MIS Panel Data to reflect a 12.5% decrease
  // Latest: 762.77, Move: -108.97 (Previous: 871.74)
  await prisma.misInformationPanel.updateMany({
    where: { snapshotId: snapshot.id, parameter: 'Total Dep' },
    data: {
      val_current: '762.77',
      growth_day: '-108.97'
    }
  });

  // 2. Update Performance Snapshot (for the Daily Movement Table)
  const param = await prisma.parameter.findUnique({ where: { code: 'TOTAL_DEPOSITS' } });
  if (param) {
      async function syncSnap(d, val) {
          const existing = await prisma.snapshot.findFirst({
              where: { branchId: branch.id, parameterId: param.id, date: d }
          });
          if (existing) {
              await prisma.snapshot.update({ where: { id: existing.id }, data: { value: val } });
          } else {
              await prisma.snapshot.create({ data: { branchId: branch.id, parameterId: param.id, date: d, value: val } });
          }
      }

      await syncSnap(targetDate, 7.63);

      const prevDate = new Date(targetDate);
      prevDate.setUTCDate(targetDate.getUTCDate() - 1);
      await syncSnap(prevDate, 8.72);
      
      console.log('Synchronized snapshots for TOTAL_DEPOSITS (in Crores).');
  }

  // 3. NUCLEAR PURGE: Deleting ALL letters for Vangamanuthu to force a clean slate
  const delLetters = await prisma.letter.deleteMany({
      where: { branchId: branch.id }
  });
  console.log('Nuclear Purge: Deleted', delLetters.count, 'letters for Vangamanuthu.');

  // 4. Create/Update the critical exception
  await prisma.misException.deleteMany({ where: { snapshotId: snapshot.id } });
  await prisma.misException.create({
    data: {
      snapshotId: snapshot.id,
      unitId: branch.id,
      businessDate: targetDate,
      type: 'RISK',
      severity: 'CRITICAL',
      parameter: 'Total Dep',
      message: 'Significant daily decrease detected (12.5%). Potential operational error.',
      triggerValue: '-108.97',
      ruleId: 'RULE-OP-RISK',
      status: 'OPEN'
    }
  });

  console.log('Consistency update successful for branch:', branch.nameEn);
  console.log('Seeded consistent -12.5% swing in both MIS and Performance data.');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
