export interface LeadershipMember {
    name: string;
    nameTa?: string;
    nameHi?: string;
    designation: string;
    designationTa?: string;
    designationHi?: string;
    isHead: boolean;
    isSecondLine?: boolean;
    role: string;
    photoUrl?: string;
}

export interface Event {
    date: string;
    name: string;
    type: string;
    venue?: string;
}

export interface Achievement {
    title: string;
    description: string;
    date: string;
    category: string;
    photoUrl?: string;
}

export interface Metric {
    val: number;
    growth: number;
}

export interface Branch {
    code: string;
    nameEn: string;
    district: string;
    business: number;
    asOnDate?: string;
    headName?: string;
    headDesignation?: string;
    headPhotoUrl?: string | null;
    secondLineName?: string;
    secondLineDesignation?: string;
    secondLinePhotoUrl?: string | null;
}

export interface SetupData {
    branches: number;
    atms: number;
    regionalOffices: number;
    staff: number;
    totalDeposits: number;
    leadership?: LeadershipMember[];
    events?: Event[];
    achievements?: Achievement[];
    business?: Metric;
    deposits?: Metric;
    casa?: Metric;
    rtd?: Metric;
    advances?: Metric;
    sb?: Metric;
    cd?: Metric;
    td?: Metric;
    branchList?: Branch[];
    asOnDate?: string;
}
