import { PrismaClient } from './server/src/generated/client/index.js';

const prisma = new PrismaClient();

async function check() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'letters'
    `;
    console.table(columns);
  } catch (err) {
    console.error('Error fetching columns:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
