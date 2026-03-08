const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function checkOrg() {
  const config = await prisma.organizationConfig.findUnique({ where: { id: 'singleton' } });
  console.log('officeNameHi in DB config:', config?.officeNameHi);
  console.log('officeNameEn in DB config:', config?.officeNameEn);
}
checkOrg().catch(console.error).finally(() => prisma.$disconnect());
