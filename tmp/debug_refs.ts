import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debugReferences() {
    const prefix = 'RO/PLNG/2026/03';
    
    console.log(`Searching for references starting with: ${prefix}`);
    
    const notes = await prisma.officeNote.findMany({
        where: { referenceNo: { startsWith: prefix } },
        select: { id: true, referenceNo: true, type: true, createdAt: true }
    });
    
    const letters = await prisma.letter.findMany({
        where: { referenceNo: { startsWith: prefix } },
        select: { id: true, referenceNo: true, type: true, createdAt: true }
    });

    console.log(`Found ${notes.length} Office Notes`);
    notes.forEach(n => console.log(`  Note [${n.type}]: ${n.referenceNo}`));

    console.log(`Found ${letters.length} Letters`);
    letters.forEach(l => console.log(`  Letter [${l.type}]: ${l.referenceNo}`));
}

debugReferences().catch(console.error).finally(() => prisma.$disconnect());
