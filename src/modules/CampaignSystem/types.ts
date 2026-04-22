export interface Branch {
    id: string;
    nameEn: string;
    code: string;
    type: string;
}

export interface Campaign {
    id: string;
    title: string;
    tagline: string;
    logoUrl: string;
    startDate: string;
    endDate: string;
    type: string;
    metric: string;
    targetValue: number;
    status: string;
    dailyData: any[]; // Used in Details
    targets: any[];   // Used in Details
    totalWorkingDays?: number;
    _count: {
        dailyData: number;
        targets: number;
    };
}

export interface PerformanceRank {
    branchId: string;
    branchName: string;
    branchCode: string;
    dailyAchievement: number;
    totalAchievement: number;
    target: number;
    percentage: number;
    isQualified: boolean;
}

export interface PerformanceReport {
    overall: PerformanceRank[];
    qualificationDate?: string;
}
