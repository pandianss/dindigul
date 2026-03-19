const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function checkCurrent() {
  const letters = await prisma.letter.findMany({ 
      where: { status: 'DRAFT' },
      orderBy: { createdAt: 'desc' }
  });
  console.log('Total drafts:', letters.length);
  for (let l of letters) {
      console.log(l.id, l.createdAt, l.orgMeta?.officeNameHi);
  }
}
checkCurrent().catch(console.error).finally(() => prisma.$disconnect());
