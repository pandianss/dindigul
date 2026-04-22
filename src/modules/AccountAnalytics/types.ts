export interface BranchStats {
    code: string;
    name: string;
    sbTotal: number;
    sbClosed: number;
    sbQualified: number;
    cdTotal: number;
    cdClosed: number;
    cdQualified: number;
    total: number;
    closed: number;
    net: number;
    qualified: number;
    lowBalance: number;
    avgBalance: number;
    sbRate: number;
    cdRate: number;
    cdAvgBalance?: number;
}

export interface AnalyticsData {
    sbThreshold: number;
    cdThreshold: number;
    eligibleSchemes: string[];
    workingDays: {
        fy: number;
        thisMonth: number;
        lastMonth: number;
    };
    sb: {
        thisMonth: number;
        lastMonth: number;
        fy: number;
        fyTotal: number;
        fyClosed: number;
        fyNet: number;
        fyBalance: number;
        pace: string;
        total: number;
        closed: number;
        net: number;
        lastMonthTotal: number;
        lastMonthClosed: number;
        thisMonthBalance: number;
        dailyRunRate?: number;
        avgPerBranch?: number;
    };
    cd: {
        thisMonth: number;
        total: number;
        closed: number;
        net: number;
        thisMonthBalance: number;
        lastMonth: number;
        lastMonthTotal: number;
        lastMonthClosed: number;
        fy: number;
        fyTotal: number;
        fyClosed: number;
        fyNet: number;
        fyBalance: number;
        monthlyRunRate?: number;
        avgPerBranch?: number;
    };
    branchCount?: number;
    branchBreakdown: BranchStats[];
    branchBreakdownFY: BranchStats[];
    calendar?: {
        fyKey: string;
        monthKey: string;
    };
}
