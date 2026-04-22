export interface KPIEntry {
    code: string;
    label: string;
    val: string;
    budget: string;
    pace: number;
    status: 'SURPASSED' | 'POSITIVE' | 'LAGGING' | 'NEGATIVE';
    growth: number;
    growthDisplay: string;
    dailyGrowth: number;
    dailyGrowthDisplay: string;
}

export interface Announcement {
    id: string;
    type: 'URGENT' | 'OPERATIONAL' | 'CIRCULAR' | 'HR' | 'CAMPAIGN' | 'INFO';
    title: string;
    body: string;
    date: string;
    author: string;
    pinned: boolean;
    branches: string[];
}

export interface ATM {
    atmId: string;
    balance: number;
    lastTxnTime: string;
    branch?: {
        code: string;
    };
}

export interface ActionItem {
    id: string;
    type: 'EXPLANATION' | 'APPRECIATION' | 'AUDIT';
    branch: string;
    param: string;
    due: string;
    status: 'READY' | 'DRAFT' | 'PENDING';
    urgent: boolean;
}

export interface FYMetrics {
    financialYear: string;
    fyWD: string;
    fyPct: number;
    qtr: string;
    qtrPct: number;
    month: string;
    monthPct: number;
    daysToFYEnd: number;
}

export interface SRMMessage {
    name: string;
    nameTa?: string;
    nameHi?: string;
    title: string;
    titleTa?: string;
    titleHi?: string;
    region: string;
    regionTa?: string;
    regionHi?: string;
    createdAt: string;
    highlight: string;
    message: string;
}

export interface Milestone {
    id: string;
    name: string;
    code: string;
    date: string;
    years: number;
}

export interface DashboardData {
    srmMessage: SRMMessage | null;
    tickers: { text: string; link?: string }[];
    announcements: Announcement[];
    kpis: KPIEntry[];
    branchPulse: Record<string, number>;
    lastUpdated: string | null;
    pendingActions: ActionItem[];
    upcomingEvents: any[];
    fyMetrics: FYMetrics;
    anniversaries: Milestone[];
}
