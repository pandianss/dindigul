/**
 * fix_staff_branches.ts
 * Re-assigns staff from phantom "Branch XXXX" entries to the properly-named
 * branches that share the same officeId. Runs before bulk re-import.
 */
import prisma from '../lib/prisma';

async function main() {
    const phantoms = await prisma.branch.findMany({
        where: { nameEn: { startsWith: 'Branch ' } },
        include: { users: { select: { id: true, username: true, fullNameEn: true } } }
    });

    let moved = 0, skipped = 0;

    for (const phantom of phantoms) {
        const numericId = phantom.officeId ?? parseInt(phantom.code);
        if (!numericId) { skipped++; continue; }

        // Find the real named branch with same officeId
        const realBranch = await prisma.branch.findFirst({
            where: {
                id: { not: phantom.id },
                OR: [
                    { officeId: numericId },
                    { code: String(numericId).padStart(4, '0') }
                ],
                nameEn: { not: { startsWith: 'Branch ' } }
            }
        });

        if (!realBranch) {
            console.log(`  KEEP (no real branch): code="${phantom.code}" name="${phantom.nameEn}" users=${phantom.users.length}`);
            skipped++;
            continue;
        }

        if (phantom.users.length > 0) {
            console.log(`  MOVE ${phantom.users.length} staff: "${phantom.nameEn}" (${phantom.code}) → "${realBranch.nameEn}" (${realBranch.code})`);
            await prisma.user.updateMany({
                where: { branchId: phantom.id },
                data: { branchId: realBranch.id }
            });
            moved += phantom.users.length;
        }

        // Now delete the empty phantom
        await prisma.branch.delete({ where: { id: phantom.id } });
        console.log(`  DELETED phantom: ${phantom.code}`);
    }

    console.log(`\nDone. Moved ${moved} staff. Kept ${skipped} phantom branches (no real counterpart).`);
    await prisma.$disconnect();
}
main().catch(console.error);
