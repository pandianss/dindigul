const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function testCode() {
  let organization = await prisma.organizationConfig.findUnique({
      where: { id: 'singleton' }
  });
  console.log('without any:', organization.officeNameHi);

  let orgAny = await prisma.organizationConfig.findUnique({
      where: { id: 'singleton' }
  });
  console.log('with any:', orgAny.officeNameHi);
        
  // Wait.. let's dump the whole object
  console.log(Object.keys(organization));
}
testCode().catch(console.error).finally(() => prisma.$disconnect());
