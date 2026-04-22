import cron from 'node-cron';
import { generateLettersForPeriod } from './letterCriteriaService';
import { createNotification } from './notificationService';
import { prisma } from '../index';
import { format, subMonths } from 'date-fns';
import { syncFullCalendar } from '../utils/calendar';

export const initScheduler = () => {
    // Run on the 1st of every month at 00:30 (offset to avoid midnight contention)
    cron.schedule('30 0 1 * *', async () => {
        const period = format(subMonths(new Date(), 1), 'MMM yyyy');
        console.log(`[Scheduler] Starting monthly letter generation for ${period}`);

        try {
            const result = await generateLettersForPeriod(period);
            console.log(`[Scheduler] Completed: ${result.created} created, ${result.skipped} skipped for ${period}`);

            // Notify admins
            const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
            for (const admin of admins) {
                await createNotification(
                    admin.id,
                    `Monthly Letters Generated — ${period}`,
                    `${result.created} letter(s) created across ${[...new Set(result.details.map(d => d.param))].length
                    } parameter(s). ${result.skipped} skipped.`,
                    'SUCCESS',
                    '/letters'
                );
            }
        } catch (err) {
            console.error('[Scheduler] Letter generation failed:', err);
            const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
            for (const admin of admins) {
                await createNotification(
                    admin.id,
                    `Letter Generation Failed — ${period}`,
                    `Scheduled letter generation encountered an error. Please generate manually from the Correspondence Centre.`,
                    'ERROR',
                    '/letters'
                );
            }
        }
    });

    console.log('[Scheduler] Monthly letter scheduler initialised');

    // Run every night at 01:00 AM to ensure calendar sync
    cron.schedule('0 1 * * *', async () => {
        console.log('[Scheduler] Starting daily calendar synchronization...');
        try {
            await syncFullCalendar();
            console.log('[Scheduler] Daily calendar sync completed successfully.');
        } catch (err) {
            console.error('[Scheduler] Daily calendar sync failed:', err);
        }
    });

    console.log('[Scheduler] Daily calendar sync scheduler initialised');
};
