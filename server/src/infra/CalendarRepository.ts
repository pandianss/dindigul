import prisma from '../lib/prisma';
import { CalendarEvaluator } from '../rules/CalendarEvaluator';
import { format, eachDayOfInterval } from 'date-fns';

/**
 * Infrastructure Layer: Data access for CalendarMaster and Holidays.
 */
export class CalendarRepository {
    
    static async getHolidays(start: Date, end: Date) {
        return await prisma.holiday.findMany({
            where: {
                date: { gte: start, lte: end }
            }
        });
    }

    /**
     * Synchronizes a specific date in the CalendarMaster.
     */
    static async syncDate(date: Date) {
        const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const endOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59));

        const holidays = await this.getHolidays(startOfDay, endOfDay);
        
        let isWorking = true;
        let holidayFlag = false;

        if (holidays.length > 0) {
            holidayFlag = true;
            isWorking = holidays.some(h => h.type === 'WORKING_DAY' || h.type === 'HALF_DAY');
        } else {
            isWorking = CalendarEvaluator.isWorkingDay(date, []);
            holidayFlag = !isWorking;
        }

        const fy = CalendarEvaluator.getFYBoundaries(date);
        
        return await prisma.calendarMaster.upsert({
            where: { calDate: startOfDay },
            update: {
                isWorkingDay: isWorking,
                holidayFlag,
                monthKey: format(date, 'yyyy-MM'),
                financialPeriod: fy.label
            },
            create: {
                calDate: startOfDay,
                isWorkingDay: isWorking,
                holidayFlag,
                monthKey: format(date, 'yyyy-MM'),
                financialPeriod: fy.label
            }
        });
    }

    /**
     * Synchronizes the full year's calendar.
     */
    static async syncFullYear() {
        const { start, end } = CalendarEvaluator.getFYBoundaries();
        const days = eachDayOfInterval({ start, end });
        for (const day of days) {
            await this.syncDate(day);
        }
    }
    static async syncAnalyticalCalendar(date: Date) {
        return await this.syncDate(date);
    }
}
