import prisma from '../lib/prisma';
import { FactRepository } from '../infra/FactRepository';
import { logger } from '../utils/logger';

/**
 * Hardened Builder Layer: Performance Review Data.
 */
export class PerformanceDataBuilder {
    
    /**
     * Constructs a performance payload for a branch.
     */
    static async build(branchCode: string, date: Date) {
        logger.info('PERF_BUILD_START', { branchCode, date });

        const branch = await prisma.branch.findUnique({
            where: { code: branchCode },
            include: { facts: { where: { date }, take: 10 } }
        });

        if (!branch) throw new Error(`Branch ${branchCode} not found`);

        const roConfig = await FactRepository.getRegionalOfficeConfig();

        return {
            branchName: branch.nameEn,
            branchCode: branch.code,
            date: date.toISOString(),
            metrics: branch.facts.map(f => ({
                metric: f.metric,
                value: Number(f.value)
            })),
            bankName: roConfig.bankName.en
        };
    }
}
