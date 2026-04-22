const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const branch = await prisma.branch.findFirst({
    where: { code: '4153' }
  });
  console.log(JSON.stringify(branch, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
