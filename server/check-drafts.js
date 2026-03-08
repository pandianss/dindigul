const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const letters = await prisma.letter.findMany({ where: { status: 'DRAFT' } });
  console.log('Drafts:', letters.length);
  if (letters.length > 0) {
    console.log('Latest nameHi:', letters[0].orgMeta?.officeNameHi);
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
