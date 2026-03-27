
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branch = await prisma.branch.findFirst({
    where: { nameEn: 'Nagayakottai' }
  });
  console.log('Nagayakottai Data:', JSON.stringify(branch, null, 2));

  const branches = await prisma.branch.findMany({
    where: { openDate: { contains: '-03-' } }
  });
  console.log('Branches in March:', branches.map(b => `${b.code}: ${b.openDate}`).join(', '));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
