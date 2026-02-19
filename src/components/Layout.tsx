import React, { useState } from 'react';
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
    Menu,
    ChevronRight,
    User,
    Mail,
    FileText,
    Truck,
    IndianRupee,
    Scale,
    ShieldCheck,
    Package
} from 'lucide-react';
import { cn } from '../utils/cn';

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
}

const SidebarItem = ({ icon: Icon, label, active }: SidebarItemProps) => (
    <div className={cn(
        "nav-item",
        active && "nav-item-active"
    )}>
        <Icon size={20} />
        <span className="flex-1 whitespace-nowrap">{label}</span>
        {active && <ChevronRight size={16} />}
    </div>
);

interface LayoutProps {
    children: React.ReactNode;
    activeView: string;
    onViewChange: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onViewChange }) => {
    const { t, i18n } = useTranslation();
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const menuItems = [
        { icon: LayoutDashboard, label: t('nav.dashboard'), key: 'dashboard', active: true },
        { icon: Bell, label: t('nav.noticeBoard'), key: 'noticeBoard' },
        { icon: BarChart3, label: t('nav.mis'), key: 'mis' },
        { icon: Mail, label: t('nav.letters'), key: 'letters' },
        { icon: FileText, label: t('nav.officeNotes'), key: 'officeNotes' },
        { icon: MessageSquare, label: t('nav.requests'), key: 'requests' },
        { icon: Calendar, label: t('nav.calendar'), key: 'calendar' },
        { icon: Truck, label: t('nav.dispatch'), key: 'dispatch' }, // Modified dispatch item
        { icon: IndianRupee, label: t('nav.expenditure'), key: 'expenditure' },
        { icon: Scale, label: t('nav.legal'), key: 'legal' },
        { icon: ShieldCheck, label: t('nav.audit'), key: 'audit' },
        { icon: Package, label: t('nav.assets'), key: 'assets' },
        { icon: Users, label: t('nav.committees'), key: 'committees' },
        { icon: BookOpen, label: t('nav.magazine'), key: 'magazine' },
    ];

    return (
        <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden" lang={i18n.language}>
            {/* Sidebar */}
            <aside className={cn(
                "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
                isSidebarOpen ? "w-72" : "w-20"
            )}>
                <div className="p-6 flex items-center space-x-3 border-b border-gray-100">
                    <div className="bg-bank-navy w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0">
                        <span className="font-bold text-xl">B</span>
                    </div>
                    {isSidebarOpen && (
                        <div className="flex flex-col">
                            <span className="font-bold text-bank-navy text-sm leading-tight uppercase tracking-wider">Bank Portal</span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">Regional Office</span>
                        </div>
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto py-4 space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.key}
                            onClick={() => onViewChange(item.key)}
                            className="w-full text-left"
                        >
                            <SidebarItem
                                icon={item.icon}
                                label={isSidebarOpen ? item.label : ''}
                                active={activeView === item.key}
                            />
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100 space-y-1">
                    <SidebarItem icon={Settings} label={isSidebarOpen ? t('nav.settings') : ''} />
                    <SidebarItem icon={LogOut} label={isSidebarOpen ? t('nav.logout') : ''} />
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-500"
                        >
                            <Menu size={24} />
                        </button>
                        <h1 className="text-xl font-bold text-bank-navy truncate">
                            {t('nav.dashboard')}
                        </h1>
                    </div>

                    <div className="flex items-center space-x-6">
                        {/* Language Switcher */}
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            {[
                                { code: 'en', label: 'EN' },
                                { code: 'ta', label: 'தமிழ்' },
                                { code: 'hi', label: 'हिन्दी' }
                            ].map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => changeLanguage(lang.code)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                                        i18n.language === lang.code
                                            ? "bg-white text-bank-navy shadow-sm"
                                            : "text-gray-500 hover:text-bank-navy"
                                    )}
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center space-x-3 border-l pl-6 border-gray-200">
                            <div className="flex flex-col text-right">
                                <span className="text-sm font-bold text-gray-900 leading-none">Anand Kumar</span>
                                <span className="text-[11px] text-gray-500 font-medium">Regional Manager</span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-bank-navy flex items-center justify-center text-white ring-2 ring-bank-gold ring-offset-2">
                                <User size={20} />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
