import { CalendarEvaluator, Holiday } from './CalendarEvaluator';

/**
 * Domain Service: Pure logic for Campaign period and qualification calculations.
 */
export class CampaignLogic {
    
    /**
     * Calculates the number of working days in a campaign period using system rules.
     */
    static calculateWorkingDays(startDate: Date, endDate: Date, holidays: Holiday[] = []): { count: number, dates: Date[] } {
        return CalendarEvaluator.getWorkingDaysInInterval(startDate, endDate, holidays);
    }

    /**
     * Determines the qualification deadline date (80% working days mark) using system rules.
     */
    static calculateQualificationDeadline(startDate: Date, endDate: Date, holidays: Holiday[] = []): Date {
        const { count, dates } = this.calculateWorkingDays(startDate, endDate, holidays);
        const index = Math.floor(count * 0.8) - 1;
        return dates[Math.max(0, index)] || endDate;
    }
    /**
     * Placeholder for ranking logic. In production, this would aggregate dailyData and sort by performance.
     */
    static async getRankings(campaignId: string, date?: Date) {
        // This is a bridge method. In a full implementation, it would call CampaignRepository to get data.
        return {
            campaignId,
            date: date || new Date(),
            rankings: []
        };
    }
}
