import prisma from '../src/lib/prisma';

async function check() {
    try {
        const count = await prisma.misParameterRegistry.count();
        console.log('Parameter registry count:', count);
        
        const samples = await prisma.misParameterRegistry.findMany({ take: 5 });
        console.log('Sample parameters:', JSON.stringify(samples, null, 2));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
