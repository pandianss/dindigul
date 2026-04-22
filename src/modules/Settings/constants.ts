import { 
    Settings, Building2, Users, Briefcase, Hash, Upload, 
    IndianRupee, Megaphone, ShieldCheck, Calculator, Command as CommandCenterIcon 
} from 'lucide-react';
import { TabGroup, Tab } from './types';

export const tabGroups: TabGroup[] = [
    {
        name: 'Organizational Masters',
        icon: Building2,
        tabs: [
            { id: 'departments', label: 'Departments', icon: Hash },
            { id: 'units', label: 'Units', icon: Building2 },
            { id: 'designations', label: 'Designations', icon: Briefcase },
            { id: 'staff', label: 'Staff', icon: Users },
            { id: 'atms', label: 'ATMs', icon: Calculator }
        ]
    },
    {
        name: 'Data & Logistics',
        icon: Upload,
        tabs: [
            { id: 'misUpload', label: 'MIS File Drops', icon: Upload },
            { id: 'budgets', label: 'Budget', icon: IndianRupee },
            { id: 'registry', label: 'In/Out Registry', icon: Hash },
            { id: 'bulletins', label: 'Bulletins', icon: Megaphone }
        ]
    },
    {
        name: 'System & Security',
        icon: Settings,
        tabs: [
            { id: 'organization', label: 'Organization', icon: Building2 },
            { id: 'command', label: 'Command Center', icon: CommandCenterIcon },
            { id: 'auditLog', label: 'Auth Audit Log', icon: ShieldCheck }
        ]
    }
];

export const getSingularLabel = (tab: Tab) => {
    const labels: Record<string, string> = {
        departments: 'Department',
        units: 'Unit',
        designations: 'Designation',
        staff: 'Staff Member',
        atms: 'ATM',
        bulletins: 'Bulletin',
        misUpload: 'MIS File',
        budgets: 'Budget Item',
        registry: 'Registry Entry',
        command: 'Command',
        auditLog: 'Audit Log'
    };
    return labels[tab] || tab;
};

export const getEndpoint = (tab: Tab) => {
    if (tab === 'units') return '/branches';
    if (tab === 'staff') return '/users';
    if (tab === 'atms') return '/atms';
    return `/${tab}`;
};
