import prisma from '../../src/lib/prisma';

async function main() {
    const branches = await prisma.branch.findMany({
        orderBy: { code: 'asc' }
    });
    
    const groups: Record<string, any[]> = {};
    branches.forEach(b => {
        const normalized = b.code.replace(/^0+/, '');
        if (!groups[normalized]) groups[normalized] = [];
        groups[normalized].push(b);
    });

    const migrationMapping: { phantomId: string, phantomCode: string, goodId: string, goodCode: string }[] = [];
    for (const [norm, members] of Object.entries(groups)) {
        if (members.length > 1) {
            const good = members.find(m => m.code.startsWith('0') || !m.nameEn.startsWith('Branch ')) || members[0];
            const phantoms = members.filter(m => m.id !== good.id);
            for (const ph of phantoms) {
                migrationMapping.push({ 
                    phantomId: ph.id, 
                    phantomCode: ph.code, 
                    goodId: good.id, 
                    goodCode: good.code 
                });
            }
        }
    }

    console.log(`Phase 1: Migrating data for ${migrationMapping.length} phantom branches...`);

    for (const { phantomId, phantomCode, goodId, goodCode } of migrationMapping) {
        console.log(`Processing Branch [${phantomCode} -> ${goodCode}]`);

        try {
            await prisma.$transaction(async (tx) => {
                // 1. Migrate models using UUID branchId/unitId
                await tx.user.updateMany({ where: { branchId: phantomId }, data: { branchId: goodId } });
                await tx.branchHistory.updateMany({ where: { branchId: phantomId }, data: { branchId: goodId } });
                await tx.letter.updateMany({ where: { branchId: phantomId }, data: { branchId: goodId } });
                await tx.branchRequest.updateMany({ where: { branchId: phantomId }, data: { branchId: goodId } });
                await tx.snapshot.updateMany({ where: { branchId: phantomId }, data: { branchId: goodId } });
                await tx.notice.updateMany({ where: { branchId: phantomId }, data: { branchId: goodId } });
                await tx.noticeAck.updateMany({ where: { branchId: phantomId }, data: { branchId: goodId } });
                await tx.stationeryMovement.updateMany({ where: { branchId: phantomId }, data: { branchId: goodId } });
                await tx.recoveryAction.updateMany({ where: { branchId: phantomId }, data: { branchId: goodId } });
                await tx.auditObservation.updateMany({ where: { branchId: phantomId }, data: { branchId: goodId } });
                await tx.atm.updateMany({ where: { branchId: phantomId }, data: { branchId: goodId } });
                await tx.regionalAsset.updateMany({ where: { branchId: phantomId }, data: { branchId: goodId } });
                await tx.postingHistory.updateMany({ where: { branchId: phantomId }, data: { branchId: goodId } });
                await tx.fact.updateMany({ where: { unitId: phantomId }, data: { unitId: goodId } });
                await tx.misSnapshot.updateMany({ where: { unitId: phantomId }, data: { unitId: goodId } });
                await tx.misException.updateMany({ where: { unitId: phantomId }, data: { unitId: goodId } });

                // 2. Migrate models using literal SOL code solId
                await tx.accountOpening.updateMany({ where: { solId: phantomCode }, data: { solId: goodCode } });
                await tx.accountClosure.updateMany({ where: { solId: phantomCode }, data: { solId: goodCode } });
                await tx.budgetMaster.updateMany({ where: { solId: phantomCode }, data: { solId: goodCode } });
                await tx.factSbDailyBranch.updateMany({ where: { solId: phantomCode }, data: { solId: goodCode } });
                await tx.factCdMonthlyBranch.updateMany({ where: { solId: phantomCode }, data: { solId: goodCode } });

                // 3. Delete the phantom branch
                await tx.branch.delete({ where: { id: phantomId } });
            });
            console.log(`Successfully migrated and deleted branch [${phantomCode}].`);
        } catch (err: any) {
            console.error(`Failed to migrate branch [${phantomCode}]:`, err.message);
        }
    }

    console.log('--- Cleanup Complete ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
