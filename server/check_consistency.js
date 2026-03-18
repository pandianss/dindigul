
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const letterCounts = await prisma.letter.groupBy({
    by: ['type', 'status'],
    _count: { id: true }
  });
  console.log('--- Letter Counts ---');
  console.log(JSON.stringify(letterCounts, null, 2));

  const opRiskDrafts = await prisma.letter.findMany({
    where: { type: 'OP_RISK', status: 'DRAFT' },
    select: { id: true, branchId: true, period: true, titleEn: true }
  });
  console.log('\n--- Current OP_RISK DRAFTS ---');
  opRiskDrafts.forEach(l => {
    console.log(`${l.branchId} | ${l.period} | ${l.titleEn}`);
  });

  const allParams = await prisma.parameter.findMany({
    select: { code: true, nameEn: true }
  });
  console.log('--- All Parameters ---');
  allParams.forEach(p => console.log(`${p.code} | ${p.nameEn}`));

  const ghostLetters = await prisma.letter.findMany({
    where: { titleEn: { contains: 'Operational Risk', mode: 'insensitive' } },
    select: { id: true, type: true, status: true, period: true, titleEn: true, branchId: true }
  });
  console.log('\n--- Letters with "Operational Risk" in title ---');
  ghostLetters.forEach(l => {
    console.log(`${l.type} | ${l.status} | ${l.period} | ${l.titleEn} | ${l.branchId}`);
  });

  const b3346 = await prisma.branch.findFirst({ where: { code: '3346' } });
  const b3933 = await prisma.branch.findFirst({ where: { code: '3933' } });
  
  const targetDate = new Date(Date.UTC(2026, 2, 16));

  const facts = await prisma.fact.findMany({
    where: { 
        unitId: { in: [b3346.id, b3933.id] }, 
        metric: 'Total Dep',
        date: targetDate
    },
    include: { branch: true },
    orderBy: { branch: { code: 'asc' } }
  });

  console.log('--- Total Dep Facts for 16.03.2026 ---');
  facts.forEach(f => {
    console.log(`${f.branch.code} | ${f.branch.type} | ${f.value}`);
  });

const types = await prisma.branch.findMany({
    select: { type: true },
    distinct: ['type']
  });
  console.log('--- Unique Branch Types ---');
  console.log(JSON.stringify(types, null, 2));

  const ro = await prisma.branch.findFirst({
    where: { type: { contains: 'REGIONAL', mode: 'insensitive' } }
  });
  if (ro) {
    console.log(`Found Regional Office: ${ro.nameEn} (Code: ${ro.code}, Type: ${ro.type})`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
