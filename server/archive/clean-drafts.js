const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function cleanDrafts() {
  const result = await prisma.letter.deleteMany();
  console.log(result.count + " drafts deleted");
}
cleanDrafts().catch(console.error).finally(() => prisma.$disconnect());
