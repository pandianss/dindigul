export interface SnapshotPanelData {
    id: string;
    parameter: string;
    val_prev_fy_start: number;
    val_prev_fy_end: number;
    val_fy_start: number;
    val_prev_m_end: number;
    val_dby: number;
    val_y_eod: number;
    val_current: number;
    growth_prev_fy: number;
    growth_day: number;
    growth_month: number;
    growth_fy: number;
    budget_month: number;
    gap_month: number;
    budget_quarter: number;
    gap_quarter: number;
    status: string;
    metadata: {
        displayName: string;
        category: string | null;
        fullForm?: string | null;
        parentParameterName?: string | null;
    };
}

export interface MisException {
    id: string;
    type: string;
    severity: string;
    parameter: string;
    message: string;
    status: string;
}

export interface MisSnapshot {
    id: string;
    unitId: string;
    branch?: { nameEn: string; code: string; type?: string };
    businessDate: string;
    status: string;
    panelData: SnapshotPanelData[];
    exceptions: MisException[];
    compareDates?: { yesterday: string; dby: string };
}

export interface IntelligenceData {
    topCustomers: any[];
    schemeAdoption: any[];
}
