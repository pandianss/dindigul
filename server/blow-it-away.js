const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function cleanAndGenerate() {
  await prisma.letter.deleteMany();
  console.log('All letters deleted');
  
  // Now hit the generate API internally using axios or fetch 
  // No, just let the user see the empty state and regenerate themselves so it picks up the real config.
}
cleanAndGenerate().catch(console.error).finally(() => prisma.$disconnect());
