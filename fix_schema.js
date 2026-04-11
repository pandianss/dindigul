import prisma from './server/src/lib/prisma.js';

async function fix() {
  try {
    console.log('Adding multi-language columns to "letters" table...');
    
    // Add columns if they don't exist
    await prisma.$executeRaw`ALTER TABLE letters ADD COLUMN IF NOT EXISTS "titleTa" TEXT`;
    await prisma.$executeRaw`ALTER TABLE letters ADD COLUMN IF NOT EXISTS "titleHi" TEXT`;
    await prisma.$executeRaw`ALTER TABLE letters ADD COLUMN IF NOT EXISTS "contentTa" TEXT`;
    await prisma.$executeRaw`ALTER TABLE letters ADD COLUMN IF NOT EXISTS "contentHi" TEXT`;
    
    console.log('Successfully updated "letters" table schema.');
  } catch (err) {
    console.error('Error updating schema:', err);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
