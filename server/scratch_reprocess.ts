import { AccountAnalyticsService } from './src/services/accountAnalyticsService';
import prisma from './src/lib/prisma';

async function main() {
  console.log('Starting full account reprocessing...');
  await AccountAnalyticsService.reprocessAllAccounts();
  console.log('Reprocessing complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
