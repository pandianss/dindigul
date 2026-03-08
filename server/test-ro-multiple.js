const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function checkRoBranch() {
  const ros = await prisma.branch.findMany({ where: { type: 'RO' } });
  console.log('Found ' + ros.length + ' RO branches');
  ros.forEach(r => console.log(r.id, r.nameEn, r.nameHi));
}
checkRoBranch().catch(console.error).finally(() => prisma.$disconnect());
