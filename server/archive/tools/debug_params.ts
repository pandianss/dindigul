import prisma from '../lib/prisma';
import { BusinessSnapshotService } from '../services/BusinessSnapshotService';

async function main() {
    console.log('--- Deep Tracing Ambilikai Panel Generation ---');
    const unit = await prisma.branch.findUnique({ where: { code: '3549' } });
    if (!unit) return;

    const snapshotDate = new Date(Date.UTC(2026, 1, 24)); // 24.02.26

    await prisma.$transaction(async (tx) => {
        // Find or create snapshot
        let snap = await tx.misSnapshot.findFirst({
            where: { unitId: unit.id, businessDate: snapshotDate }
        });

        if (!snap) {
            snap = await tx.misSnapshot.create({
                data: {
                    unitId: unit.id,
                    businessDate: snapshotDate,
                    status: 'PROCESSED',
                    version: 1
                }
            });
        }

        console.log(`Snapshot ID: ${snap.id}`);

        // Clear existing panels
        await tx.misInformationPanel.deleteMany({ where: { snapshotId: snap.id } });

        // MANUALLY re-implement part of populatePanelInternal here with LOGGING
        const metric = 'CD_Ratio';
        const d = new Date(Date.UTC(2026, 1, 23)); // Yesterday

        console.log(`\nDebugging Fallback for ${metric} on ${d.toISOString()}`);
        const val_init = await (BusinessSnapshotService as any).getMetricValue(tx, unit.id, metric, d);
        console.log(`   Initial Value from Fact: ${val_init}`);

        if (val_init === 0) {
            const adv = await (BusinessSnapshotService as any).getMetricValue(tx, unit.id, 'Adv', d);
            const dep = await (BusinessSnapshotService as any).getMetricValue(tx, unit.id, 'Total Dep', d);
            console.log(`   Fallback - Adv: ${adv}, Dep: ${dep}`);
            const calculated = dep > 0 ? (adv / dep) * 100 : 0;
            console.log(`   Calculated: ${calculated}`);
        }

        // Now run the REAL service method
        console.log('\nRunning full populatePanelInternal...');
        await (BusinessSnapshotService as any).populatePanelInternal(tx, snap.id, unit.id, snapshotDate);

        const finalPanel = await tx.misInformationPanel.findFirst({
            where: { snapshotId: snap.id, parameter: 'CD_Ratio' }
        });

        if (finalPanel) {
            console.log('\nFinal Panel Entry:');
            console.log(`   val_current:    ${finalPanel.val_current}`);
            console.log(`   val_y_eod:      ${finalPanel.val_y_eod}`);
            console.log(`   val_prev_m_end: ${finalPanel.val_prev_m_end}`);
            console.log(`   val_fy_start:   ${finalPanel.val_fy_start}`);
        }
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
