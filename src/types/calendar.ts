export type DayType =
    | 'WORKING_DAY'
    | 'PUBLIC_HOLIDAY'
    | 'RBI_HOLIDAY'
    | 'STATE_HOLIDAY'
    | 'BANK_SPECIFIC_HOLIDAY'
    | 'HALF_DAY';

export interface Holiday {
    id: string;
    date: string; // ISO format
    type: DayType;
    name: string;
    description?: string;
}

export interface CalendarConfig {
    year: number;
    holidays: Holiday[];
}
