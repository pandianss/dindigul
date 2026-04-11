import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const agriParams = [
        { name: 'Gov', display: 'Government Sponsored Advances', cat: 'ADVANCES' },
        { name: 'OthSch', display: 'Other Agriculture Schemes', cat: 'ADVANCES' },
        { name: 'Agri_JL', display: 'Agri Jewel Loans', cat: 'ADVANCES' },
        { name: 'KCC', display: 'KCC', cat: 'ADVANCES' },
        { name: 'SHG', display: 'SHG', cat: 'ADVANCES' },
        { name: 'Core_Agri', display: 'Core Agri', cat: 'ADVANCES' }
    ];

    for (const p of agriParams) {
        await prisma.misParameterRegistry.upsert({
            where: { parameterName: p.name },
            update: { isEnabled: true, displayName: p.display, category: p.cat },
            create: {
                parameterName: p.name,
                displayName: p.display,
                category: p.cat,
                isEnabled: true
            }
        });
        console.log(`Registered ${p.name}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
