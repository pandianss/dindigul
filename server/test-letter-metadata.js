const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const letters = await prisma.letter.findMany({ where: { status: 'DRAFT' } });
  if (letters.length > 0) {
    console.log('Letter nameHi:', letters[0].orgMeta.officeNameHi, 'Date:', letters[0].createdAt);
  } else {
    console.log('No drafts');
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
