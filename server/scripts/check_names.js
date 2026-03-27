const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'RO_USER' },
          { username: '63039' }
        ]
      }
    });
    console.log(JSON.stringify(users.map(u => ({ 
      username: u.username,
      fullNameEn: u.fullNameEn, 
      fullNameTa: u.fullNameTa, 
      fullNameHi: u.fullNameHi 
    })), null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
