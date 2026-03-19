const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function checkLetters() {
  const letters = await prisma.letter.findMany({
    take: 2,
    orderBy: { createdAt: 'desc' },
    select: { id: true, titleEn: true, orgMeta: true }
  });
  console.log(JSON.stringify(letters, null, 2));
}
checkLetters().catch(console.error).finally(() => prisma.$disconnect());
