import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sol = '0230';
  const unit = await prisma.branch.findUnique({
    where: { code: sol },
    include: {
      headUser: true
    }
  });

  console.log('Unit for SOL 0230:', JSON.stringify(unit, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
