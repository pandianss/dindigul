
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const targetDateStr = '2026-03-16';
  const [y, m, d] = targetDateStr.split('-').map(Number);
  const targetDate = new Date(Date.UTC(y, m - 1, d));
  
  console.log('Target Date (UTC):', targetDate.toISOString());

  // 1. Check if any snapshots exist for this date
  const snapshots = await prisma.misSnapshot.findMany({
    where: { businessDate: targetDate },
    take: 5
  });
  console.log(`Found ${snapshots.length} snapshots for this date.`);

  // 2. Check if any exceptions exist for this date
  const exceptions = await prisma.misException.findMany({
    where: { businessDate: targetDate }
  });
  console.log(`Found ${exceptions.length} total exceptions for this date.`);

  // 3. Check for CRITICAL exceptions specifically
  const critical = exceptions.filter(e => e.severity === 'CRITICAL');
  console.log(`Found ${critical.length} CRITICAL exceptions for this date.`);

  // 4. Check for RO exclusion (maybe they are RO?)
  const roExceptions = await prisma.misException.findMany({
    where: { 
        businessDate: targetDate,
        branch: { type: 'REGIONAL OFFICE' }
    }
  });
  console.log(`Found ${roExceptions.length} exceptions for REGIONAL OFFICE (excluded in logic).`);

  // 5. Check what dates DO have critical exceptions
  if (critical.length === 0) {
    const recentCritical = await prisma.misException.findMany({
      where: { severity: 'CRITICAL' },
      select: { businessDate: true },
      distinct: ['businessDate'],
      orderBy: { businessDate: 'desc' },
      take: 10
    });
    console.log('Dates with CRITICAL exceptions:', recentCritical.map(rc => rc.businessDate.toISOString()));
  }

  // 6. Check for existing letters for this date
  const letters = await prisma.letter.findMany({
    where: { 
        type: 'OP_RISK',
        period: { contains: '16.03.2026' }
    }
  });
  console.log(`Found ${letters.length} existing OP_RISK letters for "16.03.2026".`);
}

check().catch(console.error).finally(() => prisma.$disconnect());
