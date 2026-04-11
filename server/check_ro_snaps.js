const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const latest = await prisma.snapshot.findFirst({
        orderBy: { date: 'desc' },
        include: { branch: true }
    });
    if (!latest) return;
    const date = latest.date;
    const snaps = await prisma.snapshot.findMany({
        where: { date },
        include: { branch: true, parameter: true }
    });
    const roSnaps = snaps.filter(s => s.branch.type === 'REGIONAL OFFICE');
    console.log(`Date: ${date.toISOString()}`);
    console.log(`RO Snaps count: ${roSnaps.length}`);
    roSnaps.forEach(s => {
        console.log(`RO Snap: ${s.parameter.code} = ${s.value}`);
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
