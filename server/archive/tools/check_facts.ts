import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const branch = await prisma.branch.findFirst({});
    if (!branch) {
        console.log('No branches found');
        return;
    }
    const branchCode = branch.code;

    const facts = await prisma.fact.findMany({
        where: {
            unitId: branch.id,
            metric: 'Total Dep',
        },
        orderBy: { date: 'asc' }
    });
    
    console.log(`Found ${facts.length} facts for Total Dep at branch ${branchCode}`);
    for (const f of facts.slice(0, 5)) {
        console.log(f.date, f.value);
    }
    for (const f of facts.slice(-5)) {
        console.log(f.date, f.value);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
