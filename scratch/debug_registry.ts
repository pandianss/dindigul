
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const registry = await prisma.misParameterRegistry.findMany({});
  console.log('--- Parameter Registry ---');
  registry.forEach(r => {
    console.log(`- ${r.parameterName} (Enabled: ${r.isEnabled})`);
  });

  const factsCount = await prisma.fact.count({
    where: { metric: { contains: 'Cash' } }
  });
  console.log(`\nFound ${factsCount} facts containing 'Cash'`);

  const sampleFacts = await prisma.fact.findMany({
    where: { metric: { contains: 'Cash' } },
    take: 5
  });
  sampleFacts.forEach(f => {
    console.log(`Fact: ${f.metric}, Value: ${f.value}, Date: ${f.date.toISOString()}`);
  });
}

check().catch(console.error);
