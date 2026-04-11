const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const latest = await prisma.snapshot.findFirst({
        orderBy: { date: 'desc' }
    });
    if (!latest) return console.log('No snapshots');
    
    const snapshots = await prisma.snapshot.findMany({
        where: { date: latest.date },
        include: { parameter: true, branch: true }
    });
    
    const groups = {};
    snapshots.forEach(s => {
        const key = `${s.branch.code}:${s.parameter.code}`;
        if (!groups[key]) groups[key] = 0;
        groups[key]++;
    });
    
    const duplicates = Object.entries(groups).filter(([k, v]) => v > 1);
    console.log(`Date: ${latest.date.toISOString()}`);
    console.log(`Total snapshots: ${snapshots.length}`);
    console.log(`Duplicate groups found: ${duplicates.length}`);
    if (duplicates.length > 0) {
        console.log('Top 5 duplicates:');
        console.log(duplicates.slice(0, 5));
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
