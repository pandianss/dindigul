
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugData() {
  const branch = await prisma.branch.findFirst({ where: { code: '3933' } });
  if (!branch) {
    console.log('Branch 3933 not found');
    return;
  }
  console.log(`Branch 3933 ID: ${branch.id}`);

  console.log('\n--- Recent Facts for Total Dep ---');
  const facts = await prisma.fact.findMany({
    where: { 
      unitId: branch.id, 
      metric: 'Total Dep', 
      date: { gte: new Date('2026-02-01') } 
    },
    orderBy: { date: 'asc' }
  });
  facts.forEach(f => {
    console.log(`${f.date.toISOString()} | ${f.value}`);
  });

  console.log('\n--- Panel Data for Mar 16 ---');
  const sn = await prisma.misSnapshot.findFirst({
    where: { 
      unitId: branch.id, 
      businessDate: new Date(Date.UTC(2026, 2, 16)) 
    },
    include: { 
      panelData: { 
        where: { parameter: 'Total Dep' } 
      } 
    }
  });
  console.log(JSON.stringify(sn?.panelData[0], null, 2));
}

debugData().catch(console.error).finally(() => prisma.$disconnect());
