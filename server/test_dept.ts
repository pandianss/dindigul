import prisma from './src/lib/prisma';

async function test() {
    try {
        const d = await prisma.department.findMany();
        console.log(d);
    } catch (e) {
        console.error(e);
    }
}

test();
