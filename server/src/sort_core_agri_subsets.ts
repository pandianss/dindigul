import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Correcting sort order for Core Agri subsets...');

    const updates = [
        { name: 'KCC', order: 321 },
        { name: 'SHG', order: 322 },
        { name: 'Gov', order: 323 },
        { name: 'OthSch', order: 324 }
    ];

    for (const u of updates) {
        await prisma.misParameterRegistry.update({
            where: { parameterName: u.name },
            data: {
                orderIndex: u.order,
                parentParameterName: 'Core_Agri',
                category: 'Core Advances'
            }
        });
    }

    console.log('Sort order updated successfully.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
