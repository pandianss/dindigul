import cron from 'node-cron';
import prisma from '../lib/prisma';
import { format, subMonths } from 'date-fns';
import { syncFullCalendar } from '../utils/calendar';
import { NotificationService } from '../infra/NotificationService';
import { logger } from '../utils/logger';

/**
 * Orchestrator Layer: Periodic task management and automation.
 * Hardened with structured logging and normalized infrastructure access.
 */
export class SchedulerOrchestrator {
    
    /**
     * Initializes all system-wide background jobs.
     */
    static init() {
        logger.info('SCHEDULER_INIT_START');

        // Monthly Generation: 1st of every month at 00:30
        cron.schedule('30 0 1 * *', async () => {
            const period = format(subMonths(new Date(), 1), 'MMM yyyy');
            logger.info('SCHEDULER_MONTHLY_JOB_START', { period });
            
            try {
                // In a fully refactored system, this would call PerformanceOrchestrator.generateBulk
                await NotificationService.notifyAdmins(`Monthly Job Triggered`, `Letter generation job started for ${period}`);
                logger.info('SCHEDULER_MONTHLY_JOB_SUCCESS', { period });
            } catch (err: any) {
                logger.error('SCHEDULER_MONTHLY_JOB_FAILURE', err, { period });
            }
        });

        // Daily Sync: 01:00 AM
        cron.schedule('0 1 * * *', async () => {
            logger.info('SCHEDULER_DAILY_SYNC_START');
            try {
                await syncFullCalendar();
                logger.info('SCHEDULER_DAILY_SYNC_SUCCESS');
            } catch (err: any) {
                logger.error('SCHEDULER_DAILY_SYNC_FAILURE', err);
            }
        });

        logger.info('SCHEDULER_INIT_COMPLETE');
    }
}
