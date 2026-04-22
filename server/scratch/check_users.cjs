const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { designationEn: { contains: 'Chief Manager', mode: 'insensitive' } },
        { designationEn: { contains: 'AGM', mode: 'insensitive' } },
        { designationEn: { contains: 'DGM', mode: 'insensitive' } },
        { isRegionHead: true }
      ]
    },
    select: {
      id: true,
      fullNameEn: true,
      designationEn: true,
      role: true,
      isRegionHead: true
    }
  });
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
