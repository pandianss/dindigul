const prisma = require('../src/lib/prisma').default;

async function main() {
    const branch = await prisma.branch.findFirst({ where: { code: '1112' } });
    if (!branch) {
        console.log('BRANCH 1112 NOT FOUND');
        return;
    }
    console.log(`BRANCH FOUND: ${branch.nameEn} (ID: ${branch.id})`);

    const facts = await prisma.fact.findMany({
        where: {
            unitId: branch.id,
            date: new Date('2026-04-12T00:00:00Z'),
            metric: { contains: 'CASH' }
        }
    });
    console.log('FACTS FOR 1112 on 12.04.2026:', facts.length);
    facts.forEach(f => console.log(`${f.metric}: ${f.value}`));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
