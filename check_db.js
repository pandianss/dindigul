const { PrismaClient } = require('./server/src/generated/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:iob%40123@localhost:5432/dindigul_db"
    }
  }
});

async function check() {
  try {
    const count = await prisma.branch.count();
    console.log('BRANCH_COUNT:' + count);
    const first = await prisma.branch.findFirst();
    console.log('FIRST_BRANCH:' + JSON.stringify(first));
  } catch (e) {
    console.error('ERROR:' + e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
