import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // We noticed that facts on 2026-03-09 are approximately 100x larger than what they should be.
    // E.g., branch 0376 Total Dep went from 189.38 on 2026-03-04 to 18988 on 2026-03-09.
    // It seems the new upload was in actual rupees or had a different scale.
    // Let's scale down all facts for 2026-03-09 by dividing by 100.
    
    const targetDate = new Date(Date.UTC(2026, 2, 9)); // March 9, 2026
    
    const factsToUpdate = await prisma.fact.findMany({
        where: { date: targetDate }
    });
    
    console.log(`Found ${factsToUpdate.length} facts on ${targetDate.toISOString()} to scale down.`);
    
    let updated = 0;
    
    // We execute updates in small batches to avoid SQLite limits
    await prisma.$transaction(async (tx) => {
        for (const f of factsToUpdate) {
            // Need to divide by 100 and keep decent precision
            // Note: Decimal fields in Prisma are returned as objects or Strings depending on config,
            // but we can pass a float for update
            const scaledVal = Number(f.value) / 100;
            
            await tx.fact.update({
                where: { id: f.id },
                data: { value: scaledVal }
            });
            updated++;
            if (updated % 500 === 0) {
                 console.log(`Updated ${updated} facts...`);
            }
        }
    });

    console.log(`Successfully scaled down ${updated} facts by 1/100.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
