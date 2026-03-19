
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  try {
    const summary = await prisma.misException.groupBy({
      by: ['businessDate', 'severity'],
      _count: {
        id: true
      },
      orderBy: {
        businessDate: 'desc'
      }
    });

    console.log('Exception Summary:');
    summary.forEach(s => {
      console.log(`${s.businessDate.toISOString()} | ${s.severity} | ${s._count.id}`);
    });

    const activeLetters = await prisma.letter.groupBy({
        by: ['type', 'period'],
        _count: { id: true }
    });
    console.log('\nLetter Summary:');
    activeLetters.forEach(l => {
        console.log(`${l.type} | ${l.period} | ${l._count.id}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
