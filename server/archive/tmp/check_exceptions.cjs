
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Check all dates first to see what's available
  const allDates = await prisma.misException.findMany({
    select: { businessDate: true },
    distinct: ['businessDate'],
    orderBy: { businessDate: 'desc' },
    take: 10
  });
  console.log('Available dates in misException:', allDates.map(ad => ad.businessDate.toISOString()));

  const dateStr = '2026-03-16';
  const d = new Date(dateStr);
  console.log('Searching for date:', d.toISOString(), ' (ISO)');
  
  // Try matching by date parts if ISO match fails
  const ex = await prisma.misException.findMany({
    where: { 
      businessDate: d,
      severity: 'CRITICAL',
      status: 'OPEN'
    }
  });
  
  console.log(`Found ${ex.length} exceptions for exactly ${d.toISOString()}`);
  
  if (ex.length === 0) {
     // Try a range for that day
     const start = new Date(d);
     start.setHours(0,0,0,0);
     const end = new Date(d);
     end.setHours(23,59,59,999);
     const rangeEx = await prisma.misException.findMany({
       where: {
         businessDate: { gte: start, lte: end },
         severity: 'CRITICAL'
       }
     });
     console.log(`Found ${rangeEx.length} critical exceptions in range ${start.toISOString()} to ${end.toISOString()}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
