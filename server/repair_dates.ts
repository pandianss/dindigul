import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Data Repair: SOL 2706 & April Date Fix ---');

    // 1. Identify records that likely have swapped DD/MM
    // April (Month 4) records became (Month X, Day 4)
    // We look for any record in 2026 where Day is 4 and Month is NOT 4
    const records = await prisma.accountOpening.findMany({
        where: {
            acctOpnDate: {
                gte: new Date('2026-01-01'),
                lte: new Date('2026-12-31')
            }
        }
    });

    console.log(`Auditing ${records.length} records...`);

    let repairedCount = 0;
    for (const record of records) {
        if (!record.acctOpnDate) continue;

        const date = new Date(record.acctOpnDate);
        const day = date.getDate();
        const month = date.getMonth() + 1; // 1-indexed

        // If it was intended as MM/DD (4/X) but parsed as DD/MM (X/4)
        // Then Month is X and Day is 4.
        // We only fix if Month != 4 and Day == 4 (which matches the bug signature)
        if (day === 4 && month !== 4) {
            const newDate = new Date(date.getFullYear(), month - 1, day); // Original logic was swap
            // Wait, if it was MM/DD (4/2) -> DD/MM (4/2) -> Month 2, Day 4
            // To fix Month 2, Day 4 -> Month 4, Day 2
            const correctedDate = new Date(date.getFullYear(), 4 - 1, month);
            
            await prisma.accountOpening.update({
                where: { foracid: record.foracid },
                data: { acctOpnDate: correctedDate }
            });
            repairedCount++;
        }
    }

    console.log(`Repaired ${repairedCount} records.`);

    // 2. Clear Fact Tables and refresh for repaired dates
    console.log('Refreshing Fact Tables...');
    // We can just call the reprocessAllAccounts logic now that dates are fixed
    // But since I'm in a script, I'll just clear the facts for 2026
    await prisma.factSbDailyBranch.deleteMany({
        where: { openDay: { gte: new Date('2026-01-01') } }
    });
    await prisma.factCdMonthlyBranch.deleteMany({
        where: { monthKey: { startsWith: '2026' } }
    });

    console.log('Cleanup complete. Please trigger "Re-Process Data" from the UI to rebuild fact tables.');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
