import prisma from '../src/lib/prisma';
import { BusinessSnapshotService } from '../src/services/BusinessSnapshotService';

async function check() {
    try {
        const branch = await prisma.branch.findFirst({
            where: { nameEn: { contains: 'Oddanchatram', mode: 'insensitive' } }
        });
        if (!branch) {
            console.log('Branch not found');
            return;
        }
        console.log('Branch:', JSON.stringify(branch, null, 2));

        const businessDate = new Date(Date.UTC(2026, 3, 15)); // 15.04.26
        
        let snapshot = await prisma.misSnapshot.findUnique({
            where: { unitId_businessDate_version: { unitId: branch.id, businessDate, version: 1 } },
            include: { panelData: true, exceptions: true }
        });
        
        if (snapshot) {
            console.log('Regenerating Panel Data for', businessDate);
            await (BusinessSnapshotService as any).populatePanelInternal(prisma, snapshot.id, branch.id, businessDate);
            
            // Re-fetch
            snapshot = await prisma.misSnapshot.findUnique({
                where: { id: snapshot.id },
                include: { panelData: true, exceptions: true }
            });
        }
        
        if (snapshot) {
            console.log('Latest Snapshot Date:', snapshot.businessDate);
            console.log('Exception Count:', snapshot.exceptions.length);
            console.log('Exceptions:', JSON.stringify(snapshot.exceptions, null, 2));
            
            const kbp = snapshot.panelData.filter((p: any) => ['SB', 'CD', 'TD', 'CASA', 'ADV', 'TOTAL_DEPOSITS', 'TOTAL_ADVANCES'].includes(p.parameter.toUpperCase()));
            console.log('KBP Data:', JSON.stringify(kbp, null, 2));
        } else {
            console.log('No snapshot found for branch on', businessDate);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
