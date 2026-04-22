import prisma from '../lib/prisma';
import { FactRepository } from '../infra/FactRepository';
import { logger } from '../utils/logger';

/**
 * Orchestrator Layer: Coordination for Analytics and Regional Reporting.
 */
export class AnalyticsOrchestrator {
    
    /**
     * Gathers and summarizes Region performance.
     * Hardened with structured logging and normalized data access.
     */
    static async getRegionPerformance(targetDate: Date) {
        logger.info('ANALYTICS_REGION_PERF_START', { date: targetDate });

        try {
            const branches = await prisma.branch.findMany();

            const performanceData = await Promise.all(branches.map(async (branch) => {
                const cash = await FactRepository.getCashHoldings(branch.id, targetDate);
                return {
                    branchName: branch.nameEn,
                    branchCode: branch.code,
                    cashOnHand: Number(cash.totalCashOnHand),
                    excessCash: Number(cash.totalCashOnHand) - Number(cash.retentionLimit || 0)
                };
            }));

            logger.info('ANALYTICS_REGION_PERF_SUCCESS', { branchCount: branches.length });

            return {
                date: targetDate,
                totalBranches: branches.length,
                details: performanceData
            };
        } catch (err: any) {
            logger.error('ANALYTICS_REGION_PERF_FAILURE', err);
            throw err;
        }
    }
}
