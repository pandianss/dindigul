import {
    isSunday,
    isSaturday,
    format,
    eachDayOfInterval,
    startOfQuarter,
    endOfQuarter,
    startOfMonth,
    endOfMonth
} from 'date-fns';

export interface Holiday {
    date: Date | string;
    type: string;
}

/**
 * Domain Service: Pure logic for working day and financial year calculations.
 * Standardizes rules across the entire application.
 */
export class CalendarEvaluator {
    
    /**
     * Determines if a given date is a working day based on bank rules.
     */
    static isWorkingDay(date: Date, holidays: Holiday[] = []): boolean {
        const dateStr = format(date, 'yyyy-MM-dd');
        const holiday = holidays.find(h => {
            const hDate = typeof h.date === 'string' ? h.date : format(h.date, 'yyyy-MM-dd');
            return hDate === dateStr;
        });

        if (holiday) {
            if (holiday.type === 'WORKING_DAY' || holiday.type === 'HALF_DAY') return true;
            return false;
        }

        // Default constraints
        if (isSunday(date)) return false;

        if (isSaturday(date)) {
            const dayOfMonth = date.getDate();
            const isSecondSaturday = dayOfMonth >= 8 && dayOfMonth <= 14;
            const isFourthSaturday = dayOfMonth >= 22 && dayOfMonth <= 28;
            return !(isSecondSaturday || isFourthSaturday);
        }

        return true;
    }

    /**
     * Calculates the weight of a day (1 for full, 0.5 for half, 0 for holiday).
     */
    static getDayWeight(date: Date, holidays: Holiday[] = []): number {
        const dateStr = format(date, 'yyyy-MM-dd');
        const holiday = holidays.find(h => {
            const hDate = typeof h.date === 'string' ? h.date : format(h.date, 'yyyy-MM-dd');
            return hDate === dateStr;
        });

        if (holiday) {
            if (holiday.type === 'WORKING_DAY') return 1;
            if (holiday.type === 'HALF_DAY') return 0.5;
            return 0;
        }

        if (isSunday(date)) return 0;

        if (isSaturday(date)) {
            const dayOfMonth = date.getDate();
            const isSecondSaturday = dayOfMonth >= 8 && dayOfMonth <= 14;
            const isFourthSaturday = dayOfMonth >= 22 && dayOfMonth <= 28;
            return (isSecondSaturday || isFourthSaturday) ? 0 : 1;
        }

        return 1;
    }

    /**
     * Counts working days in an interval, returning both count and accurate dates.
     */
    static getWorkingDaysInInterval(start: Date, end: Date, holidays: Holiday[] = []): { count: number, dates: Date[] } {
        const days = eachDayOfInterval({ start, end });
        const workingDates = days.filter(d => this.isWorkingDay(d, holidays));
        const totalWeight = days.reduce((sum, d) => sum + this.getDayWeight(d, holidays), 0);
        
        return {
            count: totalWeight, // Weight-based for accuracy (Half days)
            dates: workingDates
        };
    }

    /**
     * Gets financial year boundaries (April 1st to March 31st).
     */
    static getFYBoundaries(date: Date = new Date()) {
        const d = new Date(date);
        const year = d.getUTCMonth() < 3 ? d.getUTCFullYear() - 1 : d.getUTCFullYear();
        const start = new Date(Date.UTC(year, 3, 1));
        const end = new Date(Date.UTC(year + 1, 2, 31, 23, 59, 59));
        const label = `${year}-${(year + 1).toString().slice(-2)}`;
        return { start, end, label };
    }
}
