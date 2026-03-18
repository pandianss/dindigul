
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  try {
    const letters = await prisma.letter.findMany({
      where: { type: 'OP_RISK' },
      select: { branchId: true, period: true, titleEn: true },
      take: 20
    });
    console.log('--- OP_RISK Letters ---');
    letters.forEach(l => console.log(`${l.period} | ${l.titleEn}`));

    const targetDate = new Date(Date.UTC(2026, 2, 16));
    const exCount = await prisma.misException.count({
      where: { businessDate: targetDate }
    });
    console.log(`\nExceptions for 2026-03-16: ${exCount}`);

    const allExDates = await prisma.misException.findMany({
        select: { businessDate: true },
        distinct: ['businessDate'],
        orderBy: { businessDate: 'desc' },
        take: 5
    });
    console.log('Available exception dates:', allExDates.map(d => d.businessDate.toISOString()));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
