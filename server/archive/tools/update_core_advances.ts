import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Regrouping Core Advances parameters...');

    const coreGroup = 'Core Advances';
    const mappings = [
        { name: 'Core Ret', order: 30 },
        { name: 'Core_Agri', order: 31 },
        { name: 'MSME', order: 32 }
    ];

    for (const m of mappings) {
        await prisma.misParameterRegistry.update({
            where: { parameterName: m.name },
            data: { category: coreGroup, orderIndex: m.order }
        });

        // Update children of these core parameters
        await prisma.misParameterRegistry.updateMany({
            where: { parentParameterName: m.name },
            data: { category: coreGroup }
        });
    }

    console.log('Update complete.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
