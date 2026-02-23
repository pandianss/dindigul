import cron from 'node-cron';
import { prisma } from '../index';
import { createNotification } from './notificationService';

export const initScheduler = () => {
    // GAP 14: Schedule performance review letters on the 1st of every month
    cron.schedule('0 0 1 * *', async () => {
        console.log('Running scheduled letter generation...');
        const monthYear = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' });

        try {
            // Find the parameter for TOTAL_DEPOSITS
            const param = await (prisma as any).parameter.findUnique({ where: { code: 'TOTAL_DEPOSITS' } });
            if (!param) return;

            // Get performers
            const snapshots = await (prisma as any).snapshot.findMany({
                where: { parameterId: param.id },
                orderBy: { value: 'desc' },
                include: { branch: true }
            });

            if (snapshots.length === 0) return;

            const top = snapshots.slice(0, 3);
            const bottom = snapshots.slice(-3).reverse();

            // Generate Appreciation Letters
            for (const snap of top) {
                await (prisma as any).letter.create({
                    data: {
                        type: 'APPRECIATION',
                        titleEn: `[Auto] Appreciation Letter - ${monthYear}`,
                        contentEn: `Automatic recognition for ${snap.branch.nameEn} for top performance in Total Deposits.`,
                        branchId: snap.branchId,
                        parameterId: param.id,
                        valueAtTime: snap.value,
                        budgetAtTime: snap.budget,
                        period: monthYear
                    }
                });
            }

            // Generate Explanation Letters
            for (const snap of bottom) {
                await (prisma as any).letter.create({
                    data: {
                        type: 'EXPLANATION',
                        titleEn: `[Auto] Explanation Letter - ${monthYear}`,
                        contentEn: `Automated shortfall notification for ${snap.branch.nameEn}. Please review performance metrics.`,
                        branchId: snap.branchId,
                        parameterId: param.id,
                        valueAtTime: snap.value,
                        budgetAtTime: snap.budget,
                        period: monthYear
                    }
                });
            }

            console.log(`Scheduled generation complete for ${monthYear}`);
        } catch (err) {
            console.error('Scheduled task failed:', err);
        }
    });

    // Optional: Schedule daily ATM alerts or other maintenance tasks
    console.log('Scheduler initialized (GAP 14)');
};
