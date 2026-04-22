const { PrismaClient } = require('./server/src/generated/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const count = await prisma.branch.count();
    console.log('BRANCH_COUNT:' + count);
  } catch (e) {
    console.error('ERROR:' + e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
