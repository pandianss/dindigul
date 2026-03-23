const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLetters() {
  try {
    const letters = await prisma.letter.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        titleEn: true,
        createdAt: true
      }
    });
    console.log('Recent Letters:');
    console.log(JSON.stringify(letters, null, 2));

    const distinctTypes = await prisma.letter.findMany({
      distinct: ['type'],
      select: { type: true }
    });
    console.log('\nDistinct Letter Types:');
    console.log(JSON.stringify(distinctTypes, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkLetters();
