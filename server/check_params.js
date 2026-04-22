
const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const params = await prisma.misParameterRegistry.findMany({
    orderBy: { orderIndex: 'asc' }
  });
  console.log(JSON.stringify(params, null, 2));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
