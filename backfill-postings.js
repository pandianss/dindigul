const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Backfilling Posting History...');
    const users = await prisma.user.findMany({
        where: {
            branchId: { not: null }
        }
    });

    console.log(`Found ${users.length} users to backfill.`);

    for (const user of users) {
        // Check if history already exists
        const existing = await prisma.postingHistory.findFirst({
            where: { userId: user.id }
        });

        if (!existing) {
            await prisma.postingHistory.create({
                data: {
                    userId: user.id,
                    branchId: user.branchId,
                    designationId: user.designationId,
                    startDate: user.createdAt,
                    isCurrent: true,
                    remarks: 'Initial seeding backfill'
                }
            });
        }
    }
    console.log('Backfill complete.');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
