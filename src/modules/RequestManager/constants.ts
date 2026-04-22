import { 
    Plus,
    MessageSquare,
    Clock,
    AlertCircle,
    User,
    Tag,
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, any> = {
    'STATIONERY': Tag,
    'HR': User,
    'IT': AlertCircle,
    'PREMISES': MessageSquare,
    'GL_HEAD_ACTIVATION': Tag,
    'OTHER': Clock
};

export const STATUS_COLORS: Record<string, string> = {
    'OPEN': 'bg-blue-100 text-blue-700',
    'IN_PROGRESS': 'bg-amber-100 text-amber-700',
    'RESOLVED': 'bg-green-100 text-green-700',
    'CLOSED': 'bg-gray-100 text-gray-700'
};

export const CATEGORIES = [
    { value: 'IT', label: 'IT Support / Hardware' },
    { value: 'HR', label: 'HR / Staffing' },
    { value: 'GL_HEAD_ACTIVATION', label: 'GL Head Enabling/Activation' },
    { value: 'STATIONERY', label: 'Stationery Requisition' },
    { value: 'PREMISES', label: 'Premises / Maintenance' },
    { value: 'OTHER', label: 'Other Requests' },
];

export const PRIORITIES = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent!' },
];
