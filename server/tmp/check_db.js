
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({
    select: {
      nameEn: true,
      openDate: true,
      code: true
    }
  });

  console.log('Total branches:', branches.length);
  const withDate = branches.filter(b => b.openDate);
  console.log('Branches with openDate:', withDate.length);
  
  if (withDate.length > 0) {
    console.log('Sample data:');
    withDate.slice(0, 5).forEach(b => {
      console.log(`${b.code} - ${b.nameEn}: ${b.openDate}`);
    });
  } else {
    console.log('NO BRANCHES HAVE OPEN DATE DATA');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
