const { AccountAnalyticsService } = require('./src/services/accountAnalyticsService');
const prisma = require('./src/lib/prisma').default;

async function main() {
  console.log('Starting full account reprocessing...');
  await AccountAnalyticsService.reprocessAllAccounts();
  console.log('Reprocessing complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
