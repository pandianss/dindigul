/**
 * cleanup_phantom_branches.ts
 * Deletes phantom branches (named "Branch XXXXX") that have no staff assigned,
 * and whose officeId matches a properly-named branch that already exists.
 * Run once after fixing the bulk import.
 */
import prisma from '../lib/prisma';

async function main() {
    // Find all anonymous "Branch XXXX" entries
    const phantoms = await prisma.branch.findMany({
        where: { nameEn: { startsWith: 'Branch ' } },
        include: { _count: { select: { users: true } } }
    });

    let deleted = 0, skipped = 0;
    for (const phantom of phantoms) {
        // If it has staff assigned, skip
        if ((phantom as any)._count.users > 0) {
            console.log(`  SKIP (has staff): code="${phantom.code}" name="${phantom.nameEn}"`);
            skipped++;
            continue;
        }

        // Check if a named branch with same officeId exists
        const realBranch = phantom.officeId
            ? await prisma.branch.findFirst({
                where: {
                    officeId: phantom.officeId,
                    id: { not: phantom.id },
                    nameEn: { not: { startsWith: 'Branch ' } }
                }
              })
            : null;

        if (realBranch) {
            console.log(`  DELETE phantom: code="${phantom.code}" (real branch: code="${realBranch.code}" name="${realBranch.nameEn}")`);
            await prisma.branch.delete({ where: { id: phantom.id } });
            deleted++;
        } else {
            console.log(`  KEEP (no real branch found): code="${phantom.code}" name="${phantom.nameEn}"`);
            skipped++;
        }
    }

    console.log(`\nDone. Deleted: ${deleted}, Kept: ${skipped}`);
    await prisma.$disconnect();
}
main().catch(console.error);
