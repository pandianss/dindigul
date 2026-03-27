const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { fullNameEn: { contains: 'Administrator', mode: 'insensitive' } },
          { username: '63039' }
        ]
      },
      include: { designation: true }
    });
    console.log(JSON.stringify(user, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
