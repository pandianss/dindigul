import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const oldRef = 'RO/PLNG/2025/04/02';
    const newRef = 'RO/PLNG/2025/04/01';
    
    console.log(`Updating ${oldRef} to ${newRef}...`);
    
    const updateResult = await prisma.officeNote.updateMany({
        where: { referenceNo: oldRef },
        data: { referenceNo: newRef }
    });
    
    console.log(`Updated ${updateResult.count} notes.`);

    const seqUpdate = await prisma.referenceSequence.updateMany({
        where: { prefix: 'RO/PLNG/2025/04', category: 'OFFICE_NOTE' },
        data: { lastNumber: 1 }
    });
    
    console.log(`Updated reference sequences.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
