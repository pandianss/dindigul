const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { designation: { nameEn: { contains: 'Chief Manager' } } },
          { designationEn: { contains: 'Chief Manager' } }
        ]
      },
      include: { designation: true, department: true }
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
