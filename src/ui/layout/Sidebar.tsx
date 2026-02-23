import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    Bell,
    BarChart3,
    MessageSquare,
    Calendar,
    Users,
    BookOpen,
    Settings,
    LogOut,
    ChevronRight,
    Mail,
    FileText,
    Truck,
    IndianRupee,
    Scale,
    ShieldCheck,
    Package
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick?: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, onClick }: SidebarItemProps) => (
    <div
        onClick={onClick}
        className={cn(
            "nav-item relative group cursor-pointer",
            active && "bg-bank-navy/5 text-bank-navy font-bold shadow-sm"
        )}
    >
        {active && (
            <div className="absolute left-[-8px] top-2 bottom-2 w-1.5 bg-bank-navy rounded-r-full" />
        )}
        <Icon size={20} className={cn("shrink-0 transition-transform", active && "scale-110")} />
        <span className="flex-1 whitespace-nowrap overflow-hidden transition-all duration-300">
            {label}
        </span>
        {active && <ChevronRight size={14} className="text-bank-navy/40" />}
    </div>
);

interface SidebarProps {
    isOpen: boolean;
    activeView: string;
    onViewChange: (view: string) => void;
}

export default function Sidebar({ isOpen, activeView, onViewChange }: SidebarProps) {
    const { t } = useTranslation();

    const menuItems = [
        { icon: LayoutDashboard, label: t('nav.dashboard'), key: 'dashboard' },
        { icon: Bell, label: t('nav.noticeBoard'), key: 'noticeBoard' },
        { icon: BarChart3, label: t('nav.mis'), key: 'mis' },
        { icon: Mail, label: t('nav.letters'), key: 'letters' },
        { icon: FileText, label: t('nav.officeNotes'), key: 'officeNotes' },
        { icon: MessageSquare, label: t('nav.requests'), key: 'requests' },
        { icon: Calendar, label: t('nav.calendar'), key: 'calendar' },
        { icon: Truck, label: t('nav.dispatch'), key: 'dispatch' },
        { icon: IndianRupee, label: t('nav.expenditure'), key: 'expenditure' },
        { icon: Scale, label: t('nav.legal'), key: 'legal' },
        { icon: ShieldCheck, label: t('nav.audit'), key: 'audit' },
        { icon: Package, label: t('nav.assets'), key: 'assets' },
        { icon: Users, label: t('nav.committees'), key: 'committees' },
        { icon: BookOpen, label: t('nav.magazine'), key: 'magazine' },
    ];

    return (
        <aside className={cn(
            "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
            isOpen ? "w-72" : "w-20"
        )}>
            <div className="p-6 flex items-center space-x-3 border-b border-gray-100">
                <div className="bg-bank-navy w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0">
                    <span className="font-bold text-xl">B</span>
                </div>
                {isOpen && (
                    <div className="flex flex-col">
                        <span className="font-bold text-bank-navy text-sm leading-tight uppercase tracking-wider">Bank Portal</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">Regional Office</span>
                    </div>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto py-4 space-y-1">
                {menuItems.map((item) => (
                    <SidebarItem
                        key={item.key}
                        icon={item.icon}
                        label={isOpen ? item.label : ''}
                        active={activeView === item.key}
                        onClick={() => onViewChange(item.key)}
                    />
                ))}
            </nav>

            <div className="p-4 border-t border-gray-100 space-y-1">
                <SidebarItem
                    icon={Settings}
                    label={isOpen ? t('nav.settings') : ''}
                    active={activeView === 'settings'}
                    onClick={() => onViewChange('settings')}
                />
                <SidebarItem icon={LogOut} label={isOpen ? t('nav.logout') : ''} />
            </div>
        </aside>
    );
}

