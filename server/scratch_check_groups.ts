import prisma from './src/lib/prisma';

async function check() {
    try {
        const groups = await prisma.branch.groupBy({
            by: ['populationGroup'],
            _count: { _all: true }
        });
        console.log(JSON.stringify(groups, null, 2));
    } catch (e) {
        console.error(e);
    }
}

check();
