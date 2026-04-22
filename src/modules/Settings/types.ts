export type Tab = 'departments' | 'units' | 'designations' | 'staff' | 'atms' | 'bulletins' | 'misUpload' | 'budgets' | 'registry' | 'auditLog' | 'command' | 'organization';

export interface MasterItem {
    id?: string;
    nameEn?: string;
    fullNameEn?: string;
    nameTa?: string;
    fullNameTa?: string;
    nameHi?: string;
    fullNameHi?: string;
    designationEn?: string;
    designationTa?: string;
    designationHi?: string;
    code?: string;
    username?: string;
    type?: string;
    openDate?: string;
    populationGroup?: string;
    address?: string;
    addressTa?: string;
    addressHi?: string;
    phone?: string;
    email?: string;
    riskCategory?: string;
    riskEffectiveDate?: string;
    specialStatus?: string | string[];
    gender?: string;
    officeId?: number;
    workId?: number;
    role?: string;
    grade?: string;
    designationId?: string;
    branchId?: string;
    sealPath?: string;
    departmentId?: string;
    departmentIds?: string[];
    managedDepartmentIds?: string[];
    isUnitHead?: boolean;
    isSecondLine?: boolean;
    designation?: { nameEn: string };
    branch?: { nameEn: string, headUserId?: string, secondLineUserId?: string, type?: string };
    department?: { nameEn: string };
    departments?: { id: string, nameEn: string }[];
    managedDepartments?: { id: string, nameEn: string }[];
    photo?: { data: string };
    photoData?: string | ArrayBuffer | null;
    atmId?: string;
    lastTxnTime?: string;
    balance?: number;
    size?: string;
}

export interface TabGroup {
    name: string;
    icon: any;
    tabs: {
        id: Tab;
        label: string;
        icon: any;
    }[];
}
