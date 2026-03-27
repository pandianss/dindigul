const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const types = await prisma.branch.groupBy({
    by: ['type'],
    _count: { _all: true }
  });
  
  console.log(JSON.stringify(types, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
