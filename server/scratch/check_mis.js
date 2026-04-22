
const prisma = require('../dist/lib/prisma').default;

async function check() {
  try {
    const logs = await prisma.misImportLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log('Latest Import Logs:');
    console.log(JSON.stringify(logs, null, 2));

    const latestSnapshots = await prisma.misSnapshot.findMany({
      select: { businessDate: true },
      distinct: ['businessDate'],
      orderBy: { businessDate: 'desc' },
      take: 5
    });
    console.log('Latest Snapshot Dates:');
    console.log(JSON.stringify(latestSnapshots, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
