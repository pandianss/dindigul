
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const dateStr = '2026-03-16';
  const d = new Date(dateStr);
  console.log('Searching for date:', d.toISOString());
  
  const ex = await prisma.misException.findMany({
    where: { 
      businessDate: d,
      severity: 'CRITICAL',
      status: 'OPEN'
    }
  });
  
  console.log(`Found ${ex.length} exceptions for ${dateStr}`);
  if (ex.length > 0) {
    console.log('Sample unitId:', ex[0].unitId);
  } else {
    // Check all dates
    const allDates = await prisma.misException.findMany({
      select: { businessDate: true },
      distinct: ['businessDate'],
      orderBy: { businessDate: 'desc' },
      take: 5
    });
    console.log('Available dates in misException:', allDates.map(ad => ad.businessDate.toISOString()));
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
