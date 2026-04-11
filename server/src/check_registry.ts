import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkRegistry() {
  const reg = await (prisma as any).misParameterRegistry.findMany({
    where: { isEnabled: true },
    select: { parameterName: true, displayName: true }
  });
  console.log('Registry Enabled Parameters:', reg);
  
  const panels = await (prisma as any).misInformationPanel.findMany({
    take: 10,
    select: { parameter: true, val_current: true }
  });
  console.log('Sample Panels:', panels);
}

checkRegistry().catch(console.error).finally(() => prisma.$disconnect());
