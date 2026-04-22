import React from 'react';
import { Settings as SettingsIcon, Trophy } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface AnalyticsHeaderProps {
    activeTab: 'overview' | 'intelligence' | 'exceptions' | 'presentation_studio' | 'special_report';
    setActiveTab: (tab: any) => void;
    showSettings: boolean;
    setShowSettings: (show: boolean) => void;
    fetchSpecialReport: (period: any) => void;
    reportPeriod: 'month' | 'fy';
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
    activeTab,
    setActiveTab,
    showSettings,
    setShowSettings,
    fetchSpecialReport,
    reportPeriod
}) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-black text-bank-navy tracking-tight uppercase">Advanced Analytics</h2>
                <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-wider">Lineage, Growth & Intelligence Hub</p>
            </div>
            <div className="flex items-center bg-gray-100 p-1 rounded-2xl shadow-inner">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                        activeTab === 'overview' ? "bg-white text-bank-navy shadow-sm" : "text-gray-400 hover:text-gray-600")}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('intelligence')}
                    className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                        activeTab === 'intelligence' ? "bg-white text-bank-navy shadow-sm" : "text-gray-400 hover:text-gray-600")}
                >
                    Intelligence Hub
                </button>
                <button
                    onClick={() => setActiveTab('exceptions')}
                    className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                        activeTab === 'exceptions' ? "bg-white text-bank-navy shadow-sm" : "text-gray-400 hover:text-gray-600")}
                >
                    Compliance
                </button>
                <button
                    onClick={() => setActiveTab('presentation_studio')}
                    className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                        activeTab === 'presentation_studio' ? "bg-white text-bank-navy shadow-sm" : "text-gray-400 hover:text-gray-600")}
                >
                    Presentation Studio
                </button>
                <button
                    onClick={() => { setActiveTab('special_report'); fetchSpecialReport(reportPeriod); }}
                    className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center space-x-1",
                        activeTab === 'special_report' ? "bg-bank-gold text-white shadow-sm" : "text-gray-400 hover:text-bank-gold")}
                >
                    <Trophy size={12} />
                    <span>Special Report</span>
                </button>
            </div>
            <div className="flex items-center space-x-3">
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-gray-500 hover:text-bank-navy shadow-sm"
                >
                    <SettingsIcon size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Settings</span>
                </button>
            </div>
        </div>
    );
};
