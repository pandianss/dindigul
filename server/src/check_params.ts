import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkParams() {
  const result = await (prisma as any).misInformationPanel.findMany({
    take: 50,
    distinct: ['parameter'],
    select: { parameter: true }
  });
  console.log('Parameters in MisInformationPanel:', result.map((p: any) => p.parameter));
}

checkParams().catch(console.error).finally(() => prisma.$disconnect());
