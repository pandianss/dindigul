import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const calendar = await prisma.calendarMaster.aggregate({
        _min: { calDate: true },
        _max: { calDate: true },
        _count: { calDate: true }
    });
    console.log('Calendar range:', calendar);

    const accounts = await prisma.accountOpening.count();
    console.log('Total accounts in AccountOpening:', accounts);

    const facts = await prisma.fact.count();
    console.log('Total facts:', facts);
    
    const sampleAccounts = await prisma.accountOpening.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
    });
    console.log('Sample accounts:', sampleAccounts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
