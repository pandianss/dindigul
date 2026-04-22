import prisma from '../lib/prisma';
import { RuleEvaluator } from '../rules/RuleEvaluator';
import { SnapshotRepository } from '../infra/SnapshotRepository';
import { CacheManager } from '../infra/CacheManager';
import { logger } from '../utils/logger';
import { toUTCDate } from '../utils/businessUtils';

/**
 * Orchestrator Layer: Coordination for MIS Snapshots and Rule Evaluation.
 */
export class SnapshotOrchestrator {
    private static cache = CacheManager.getInstance();

    /**
     * Freezes a snapshot and triggers rule evaluation.
     */
    static async freezeAndEvaluate(snapshotId: string) {
        logger.info('SNAPSHOT_FREEZE_START', { snapshotId });

        try {
            // 1. Transactional Freeze
            const snapshot = await SnapshotRepository.freeze(snapshotId);
            
            // 2. Pure Domain Logic Evaluation
            await RuleEvaluator.evaluateSnapshot(snapshot.id);

            logger.info('SNAPSHOT_FREEZE_SUCCESS', { snapshotId: snapshot.id });
            return snapshot;
        } catch (err: any) {
            logger.error('SNAPSHOT_FREEZE_FAILURE', err, { snapshotId });
            throw err;
        }
    }

    /**
     * Retrieves the latest snapshot with caching.
     */
    static async getLatestSnapshot(unitId: string) {
        const cacheKey = `snapshot_latest_${unitId}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        const snapshot = await prisma.misSnapshot.findFirst({
            where: { unitId },
            orderBy: { businessDate: 'desc' },
            include: { panelData: true }
        });

        if (snapshot) {
            this.cache.set(cacheKey, snapshot, 600); // 10 min cache
        }
        return snapshot;
    }

    static async finalizeAllSnapshots(date: string) {
        const businessDate = toUTCDate(date);
        const result = await prisma.misSnapshot.updateMany({
            where: { businessDate, status: 'DRAFT' },
            data: { status: 'FROZEN' }
        });
        return { message: `${result.count} snapshots finalized`, count: result.count };
    }

    static async getExceptionSummary(date: string) {
        const businessDate = toUTCDate(date);
        
        const [exceptions, snapshots] = await Promise.all([
            prisma.misException.findMany({
                where: { businessDate },
                include: { branch: true }
            }),
            prisma.misSnapshot.findMany({
                where: { businessDate }
            })
        ]);

        const snapshotMap = Object.fromEntries(snapshots.map(s => [s.unitId, s.status]));
        
        const grouped = exceptions.reduce((acc: any, ex: any) => {
            const code = ex.branch?.code || '9999';
            if (!acc[code]) {
                acc[code] = {
                    branchCode: code,
                    branchName: ex.branch.nameEn,
                    snapshotStatus: snapshotMap[ex.unitId] || 'PROVISIONAL',
                    exceptionCount: 0,
                    criticalCount: 0,
                    highCount: 0,
                    mediumCount: 0,
                    exceptions: []
                };
            }
            
            acc[code].exceptionCount++;
            if (ex.severity === 'CRITICAL') acc[code].criticalCount++;
            else if (ex.severity === 'HIGH') acc[code].highCount++;
            else if (ex.severity === 'MEDIUM') acc[code].mediumCount++;
            
            acc[code].exceptions.push(ex);
            return acc;
        }, {});

        // Sort by critical count then high count
        return Object.values(grouped).sort((a: any, b: any) => 
            (b.criticalCount - a.criticalCount) || (b.highCount - a.highCount)
        );
    }
}
