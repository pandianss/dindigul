import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    Bell,
    BarChart3,
    MessageSquare,
    Calendar,
    Settings,
    LogOut,
    Menu,
    ChevronRight,
    User,
    FileText,
    IndianRupee,
    Scale,
    ShieldCheck,
    Package
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../context/AuthContext';
import ChatPanel from '../ui/chat/ChatPanel';

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
}

const SidebarItem = ({ icon: Icon, label, active, minimized }: SidebarItemProps & { minimized?: boolean }) => (
    <div className={cn(
        "nav-item relative group flex items-center transition-all duration-300",
        minimized ? "justify-center px-0 mx-0 h-12 w-12 mx-auto" : "gap-3 px-4 py-3 mx-2",
        active && "bg-bank-navy/5 text-bank-navy font-black shadow-[inset_0_0_0_1px_rgba(33,53,127,0.1)]"
    )}>
        {active && (
            <div className={cn(
                "absolute bg-bank-gold rounded-full shadow-[2px_0_8px_rgba(212,175,55,0.4)] transition-all duration-300",
                minimized ? "left-[-4px] top-3 bottom-3 w-1.5" : "left-[-8px] top-2 bottom-2 w-1.5"
            )} />
        )}
        <Icon size={18} className={cn("shrink-0 transition-transform duration-300", active ? "scale-110 text-bank-navy" : "text-gray-400 group-hover:text-bank-navy")} />
        {!minimized && (
            <>
                <span className="flex-1 whitespace-nowrap overflow-hidden transition-all duration-300 text-sm tracking-tight">
                    {label}
                </span>
                {active && <ChevronRight size={14} className="text-bank-navy/30 animate-in slide-in-from-left-2 duration-300" />}
            </>
        )}
    </div>
);

interface LayoutProps {
    children: React.ReactNode;
    activeView: string;
    onViewChange: (view: string) => void;
    portalMode: 'guest' | 'region';
    onExitPortal: () => void;
}

const Layout: React.FC<LayoutProps> = ({
    children,
    activeView,
    onViewChange,
    portalMode,
    onExitPortal
}) => {
    const { t, i18n } = useTranslation();
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isChatOpen, setChatOpen] = useState(false);

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const { logout, user: authUser } = useAuth();

    const menuItems = [
        { icon: LayoutDashboard, label: t('nav.dashboard'), key: 'dashboard' },
        { icon: Bell, label: t('nav.noticeBoard'), key: 'noticeBoard' },
        { icon: BarChart3, label: t('nav.mis'), key: 'mis', restricted: true },
        { icon: FileText, label: t('nav.officeNotes'), key: 'officeNotes', restricted: true },
        { icon: MessageSquare, label: t('nav.requests'), key: 'requests', restricted: true },
        { icon: Calendar, label: t('nav.calendar'), key: 'calendar' },
        { icon: IndianRupee, label: t('nav.expenditure'), key: 'expenditure', restricted: true },
        { icon: Scale, label: t('nav.legal'), key: 'legal', restricted: true },
        { icon: ShieldCheck, label: t('nav.audit'), key: 'audit', restricted: true },
        { icon: Package, label: t('nav.assets'), key: 'assets', restricted: true },
    ];

    const visibleItems = portalMode === 'guest'
        ? menuItems.filter(item => !item.restricted)
        : menuItems;

    const allItems = [
        ...menuItems,
        { key: 'settings', label: t('nav.settings'), icon: Settings }
    ];
    const currentTitle = allItems.find(item => item.key === activeView)?.label ?? t('nav.dashboard');

    const handleExit = () => {
        if (portalMode === 'region') {
            logout();
        }
        onExitPortal();
    };

    return (
        <div className="flex h-screen bg-[#FDFDFD] text-gray-900 overflow-hidden font-sans" lang={i18n.language}>
            {/* Sidebar */}
            <aside className={cn(
                "bg-white border-r border-gray-200 transition-all duration-500 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
                isSidebarOpen ? "w-72" : "w-20"
            )}>
                <div className="h-20 flex items-center px-6 border-b border-gray-100 overflow-hidden bg-white">
                    <img
                        src={isSidebarOpen ? "/assets/logo_full.svg" : "/assets/logo_center.svg"}
                        alt="Logo"
                        onClick={onExitPortal}
                        className={cn(
                            "h-8 transition-all duration-500 shrink-0 cursor-pointer hover:scale-105",
                            isSidebarOpen ? "w-auto" : "w-8 object-contain scale-125"
                        )}
                    />
                </div>

                <nav className="flex-1 overflow-y-auto px-2 py-6 space-y-1 custom-scrollbar">
                    {visibleItems.map((item) => (
                        <button
                            key={item.key}
                            onClick={() => onViewChange(item.key)}
                            className="w-full text-left"
                        >
                            <SidebarItem
                                icon={item.icon}
                                label={item.label}
                                active={activeView === item.key}
                                minimized={!isSidebarOpen}
                            />
                        </button>
                    ))}
                </nav>

                <div className="p-2 pb-6 space-y-1 border-t border-gray-50 bg-gray-50/30">
                    {portalMode === 'region' && (
                        <button
                            onClick={() => onViewChange('settings')}
                            className="w-full text-left"
                        >
                            <SidebarItem
                                icon={Settings}
                                label={t('nav.settings')}
                                active={activeView === 'settings'}
                                minimized={!isSidebarOpen}
                            />
                        </button>
                    )}
                    <button onClick={handleExit} className="w-full text-left group mt-1">
                        <div className={cn(
                            "nav-item flex items-center text-red-500/70 hover:bg-red-50 hover:text-red-600 transition-all rounded-lg",
                            isSidebarOpen ? "gap-3 px-4 py-3 mx-2" : "justify-center px-0 mx-0 h-12 w-12 mx-auto"
                        )}>
                            <LogOut size={18} className={cn("shrink-0 transition-transform", isSidebarOpen && "group-hover:-translate-x-1")} />
                            {isSidebarOpen && (
                                <span className="flex-1 font-bold text-sm tracking-tight">
                                    {portalMode === 'guest' ? 'Exit Portal' : t('nav.logout')}
                                </span>
                            )}
                        </div>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                {/* Header */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={() => setSidebarOpen(!isSidebarOpen)}
                            className="group p-2.5 hover:bg-bank-navy/5 rounded-xl transition-all text-gray-400 hover:text-bank-navy"
                        >
                            <Menu size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black text-bank-navy truncate tracking-tight uppercase">
                                {currentTitle}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center space-x-8">
                        {portalMode === 'region' && (
                            <button
                                onClick={() => setChatOpen(true)}
                                className="relative p-2 bg-gray-100/50 hover:bg-bank-navy/5 rounded-xl transition-all text-gray-400 hover:text-bank-navy"
                                title="Group Chat"
                            >
                                <MessageSquare size={20} />
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                            </button>
                        )}
                        {/* Language Switcher */}
                        <div className="flex items-center bg-gray-100/50 p-1 rounded-xl border border-gray-200/50">
                            {[
                                { code: 'en', label: 'EN' },
                                { code: 'ta', label: 'தமிழ்' },
                                { code: 'hi', label: 'हिन्दी' }
                            ].map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => changeLanguage(lang.code)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-[10px] font-black transition-all tracking-wider",
                                        i18n.language === lang.code
                                            ? "bg-white text-bank-navy shadow-[0_2px_8px_rgba(0,0,0,0.05)] ring-1 ring-gray-100"
                                            : "text-gray-400 hover:text-bank-navy"
                                    )}
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center space-x-4 border-l pl-8 border-gray-100">
                            <div className="flex flex-col text-right">
                                <span className="text-sm font-black text-bank-navy leading-none tracking-tight">{authUser?.name || 'Staff Member'}</span>
                                <span className="text-[10px] text-bank-gold font-black uppercase tracking-widest mt-1 opacity-80">{authUser?.role || 'Portal User'}</span>
                            </div>
                            <div className="relative group cursor-pointer">
                                <div className="absolute inset-0 bg-bank-gold rounded-2xl blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
                                <div className="relative w-11 h-11 rounded-2xl bg-bank-navy flex items-center justify-center text-white shadow-lg overflow-hidden border-2 border-white">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                                    <User size={20} className="group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto px-6 py-8 bg-[#FDFDFD]">
                    <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {children}
                    </div>
                </main>
            </div>
            {portalMode === 'region' && (
                <ChatPanel open={isChatOpen} onClose={() => setChatOpen(false)} />
            )}
        </div>
    );
};

export default Layout;
