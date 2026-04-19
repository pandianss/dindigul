import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function inspectLetters() {
    console.log("--- Inspecting OP_RISK letters for 15.04.2026 ---");
    
    // Find letters generated today
    const letters = await (prisma as any).letter.findMany({
        where: {
            type: 'OP_RISK',
            period: '15.04.2026'
        },
        include: { branch: true },
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    if (letters.length === 0) {
        console.log("No letters found matching the criteria.");
    } else {
        for (const l of letters) {
            console.log(`\n--- Letter ID: ${l.id} | Branch: ${l.branch.nameEn} (${l.branch.code}) ---`);
            console.log(`Status: ${l.status} | Created at: ${l.createdAt}`);
            console.log(`Title: ${l.titleEn}`);
            
            // Check for [MOVEMENT_TABLE] and [EXCEPTION_TABLE] placeholders in content
            const content = l.contentEn || '';
            console.log(`Has [MOVEMENT_TABLE]: ${content.includes('[MOVEMENT_TABLE]')}`);
            console.log(`Has [EXCEPTION_TABLE]: ${content.includes('[EXCEPTION_TABLE]')}`);
            
            // Inspect orgMeta for dailyMovement and exceptions
            const meta = l.orgMeta as any;
            if (meta) {
                console.log(`Movements in meta: ${meta.dailyMovement?.length || 0}`);
                if (meta.dailyMovement?.length > 0) {
                    console.log("Sample movements:", meta.dailyMovement.slice(0, 3).map((m: any) => `${m.parameter} (${m.category})`));
                }
                console.log(`Exceptions in meta: ${meta.exceptions?.length || 0}`);
                if (meta.exceptions?.length > 0) {
                    console.log("Exceptions:", meta.exceptions.map((e: any) => `${e.parameter}: ${e.ruleId}`));
                }
            } else {
                console.log("No orgMeta found.");
            }
        }
    }

    await prisma.$disconnect();
}

inspectLetters();
