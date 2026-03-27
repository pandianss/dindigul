const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const dept = await prisma.department.findFirst({
      where: { OR: [{ nameEn: 'Planning' }, { code: 'PLNG' }] }
    });

    if (dept) {
      await prisma.department.update({
        where: { id: dept.id },
        data: { sealPath: 'assets/Planning Seal.svg' }
      });
      console.log('Updated Planning department seal path to SVG.');
    } else {
      console.log('Planning department not found.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
