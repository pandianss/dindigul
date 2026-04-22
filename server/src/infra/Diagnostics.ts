import prisma from '../lib/prisma';

/**
 * Infrastructure Layer: Internal system diagnostics and health checks.
 */
export class Diagnostics {
    /**
     * Performs a comprehensive check of the CASA Hub's data integrity.
     */
    static async diagnoseCASA() {
        const results: string[] = [];
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // 1. Calendar
        const cal = await prisma.calendarMaster.findUnique({ where: { calDate: today } });
        results.push(`Calendar for today: ${cal ? 'OK' : 'MISSING'}`);

        // 2. Planning Config
        const configs = await prisma.systemConfig.findMany({ where: { group: 'PLANNING' } });
        results.push(`Planning Configs: ${configs.length} found`);

        // 3. Facts
        const factCount = await prisma.fact.count({ where: { metric: { startsWith: 'PLAN_' } } });
        results.push(`Planning Facts: ${factCount} entries`);

        return results;
    }
}
