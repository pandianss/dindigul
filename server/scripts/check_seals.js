const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst({
      where: { fullNameEn: 'System Administrator' },
      include: { department: true }
    });
    console.log('User:', JSON.stringify(user, null, 2));

    const depts = await prisma.department.findMany();
    console.log('All Departments:', JSON.stringify(depts, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
