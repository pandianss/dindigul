const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function checkRoBranch() {
  const ro = await prisma.branch.findFirst({ where: { type: 'RO' } });
  console.log('Branch nameHi:', ro.nameHi);
  const letters = await prisma.letter.findMany({ where: { status: 'DRAFT' } });
  if (letters.length > 0) {
    console.log('Letter nameHi:', letters[0].orgMeta.officeNameHi);
  }
}
checkRoBranch().catch(console.error).finally(() => prisma.$disconnect());
