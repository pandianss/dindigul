import { useTranslation } from 'react-i18next';
import { Menu, User, Bell } from 'lucide-react';
import { cn } from '@/utils/cn';

interface HeaderProps {
    onToggleSidebar: () => void;
    onToggleChat: () => void;
}

export default function Header({ onToggleSidebar, onToggleChat }: HeaderProps) {
    const { t, i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-4">
                <button
                    onClick={onToggleSidebar}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-500"
                >
                    <Menu size={24} />
                </button>
                <h1 className="text-xl font-bold text-bank-navy truncate">
                    {t('nav.dashboard')}
                </h1>
            </div>

            <div className="flex items-center space-x-6">
                <button
                    onClick={onToggleChat}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-500 relative"
                >
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

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
    );
}

