
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const targetDate = new Date(Date.UTC(2026, 2, 16));
  const start = new Date(targetDate);
  start.setUTCHours(0,0,0,0);
  const end = new Date(targetDate);
  end.setUTCHours(23,59,59,999);

  const snapshotCount = await prisma.misSnapshot.count({
    where: { businessDate: { gte: start, lte: end } }
  });
  console.log('Snapshot Count for Mar 16:', snapshotCount);

  const totalExCount = await prisma.misException.count({
    where: { businessDate: { gte: start, lte: end } }
  });
  console.log('Total Exception Count for Mar 16 (any severity):', totalExCount);

  if (totalExCount > 0) {
      const exBreakdown = await prisma.misException.groupBy({
          by: ['severity'],
          where: { businessDate: { gte: start, lte: end } },
          _count: { id: true }
      });
      console.log('Exception breakdown for Mar 16:', JSON.stringify(exBreakdown));
  }

  const latestSnap = await prisma.misSnapshot.findFirst({
      orderBy: { businessDate: 'desc' }
  });
  console.log('Latest businessDate in misSnapshot:', latestSnap ? latestSnap.businessDate.toISOString() : 'None');
}

check().catch(console.error).finally(() => prisma.$disconnect());
