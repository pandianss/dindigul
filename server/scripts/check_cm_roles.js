const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { designation: { nameEn: { contains: 'Chief Manager', mode: 'insensitive' } } },
          { designationEn: { contains: 'Chief Manager', mode: 'insensitive' } }
        ]
      },
      include: { designation: true }
    });
    console.log(JSON.stringify(users.map(u => ({ 
      fullNameEn: u.fullNameEn, 
      role: u.role, 
      branchId: u.branchId,
      designationEn: u.designationEn,
      designationName: u.designation?.nameEn
    })), null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
