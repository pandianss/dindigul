const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function checkLetters() {
  const letters = await prisma.letter.findMany({ where: { status: 'DRAFT' }, take: 1 });
  console.log(JSON.stringify(letters[0]?.orgMeta, null, 2));
}
checkLetters().catch(console.error).finally(() => prisma.$disconnect());
