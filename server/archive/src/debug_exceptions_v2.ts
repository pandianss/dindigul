
import prisma from './lib/prisma';

async function check() {
  try {
    const targetDateStr = '2026-03-16';
    const [y, m, d] = targetDateStr.split('-').map(Number);
    const targetDate = new Date(Date.UTC(y, m - 1, d));
    
    console.log('Target Date (UTC):', targetDate.toISOString());

    const exceptions = await prisma.misException.findMany({
      where: { businessDate: targetDate }
    });
    console.log(`Found ${exceptions.length} total exceptions for this date.`);

    const critical = exceptions.filter(e => e.severity === 'CRITICAL');
    console.log(`Found ${critical.length} CRITICAL exceptions for this date.`);

    if (exceptions.length > 0) {
        console.log('First exception details:', {
            unitId: exceptions[0].unitId,
            severity: exceptions[0].severity,
            status: exceptions[0].status,
            businessDate: exceptions[0].businessDate.toISOString()
        });
    }

    const roEx = await prisma.misException.count({
        where: { businessDate: targetDate, branch: { type: 'REGIONAL OFFICE' } }
    });
    console.log(`Exceptions for REGIONAL OFFICE: ${roEx}`);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
