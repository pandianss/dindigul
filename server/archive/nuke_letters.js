
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function nuke() {
  const result = await prisma.letter.deleteMany({
    where: { type: 'OP_RISK', status: 'DRAFT' }
  });
  console.log('Global Nuke Summary:');
  console.log('Deleted OP_RISK drafts:', result.count);
}

nuke().catch(console.error).finally(() => prisma.$disconnect());
