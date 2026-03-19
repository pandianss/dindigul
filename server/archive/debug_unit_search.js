
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function r() {
  const panels = await prisma.misInformationPanel.findMany({
    where: { 
      parameter: 'Total Dep', 
      val_prev_m_end: { gte: 38, lte: 40 } 
    },
    include: { 
      snapshot: { 
        include: { branch: true } 
      } 
    }
  });
  console.log('Found ' + panels.length + ' panels');
  const results = panels.map(p => ({
    code: p.snapshot.branch.code,
    name: p.snapshot.branch.nameEn,
    date: p.snapshot.businessDate.toISOString(),
    current: p.val_current.toString(),
    prev: p.val_prev_m_end.toString(),
    growth: p.growth_month.toString()
  }));
  console.log(JSON.stringify(results, null, 2));
}

r().catch(console.error).finally(() => prisma.$disconnect());
