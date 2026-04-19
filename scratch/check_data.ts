
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const branch = await prisma.branch.findUnique({ where: { code: '3437' } });
  if (!branch) {
    console.log('Branch 3437 not found');
    return;
  }

  const businessDate = new Date('2026-04-12T00:00:00.000Z');
  console.log(`Checking data for Branch: ${branch.nameEn} on ${businessDate.toISOString()}`);

  const panels = await prisma.misInformationPanel.findMany({
    where: {
      snapshot: { unitId: branch.id, businessDate: businessDate }
    }
  });

  console.log(`Found ${panels.length} panel records`);
  panels.forEach(p => {
    console.log(`- Param: ${p.parameter}, Value: ${p.val_current}`);
  });

  const registry = await prisma.misParameterRegistry.findMany({
    where: { parameterName: { contains: 'Cash' } }
  });
  console.log('Registered Cash Parameters:', registry.map(r => r.parameterName));
}

check().catch(console.error);
