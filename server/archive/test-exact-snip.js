const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function testCode() {
  let organization = await prisma.organizationConfig.findUnique({
      where: { id: 'singleton' }
  });
  const roBranch = await prisma.branch.findFirst({
      where: { type: 'RO' }
  });
  const meta = {
      ...organization,
      officeNameEn: roBranch?.nameEn || "Dindigul Regional Office",
      officeNameTa: roBranch?.nameTa || "??????????? ????? ????????",
      officeNameHi: roBranch?.nameHi || "???????? ????????? ????????"
  };
  console.log(meta.officeNameEn);
  console.log(meta.officeNameTa);
  console.log(meta.officeNameHi);
}
testCode().catch(console.error).finally(() => prisma.$disconnect());
