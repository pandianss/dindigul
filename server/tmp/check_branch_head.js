const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const branches = await prisma.branch.findMany({
    where: { code: { in: ['0376', '0332'] } }, // Palani and Dindigul Main from screenshot
    include: { headUser: true }
  });
  
  console.log(JSON.stringify(branches, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
