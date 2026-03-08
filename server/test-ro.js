const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function checkRoBranch() {
  const ro = await prisma.branch.findFirst({ where: { type: 'RO' } });
  console.log(ro);
}
checkRoBranch().catch(console.error).finally(() => prisma.$disconnect());
