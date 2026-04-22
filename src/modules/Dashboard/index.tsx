import React, { useState, useEffect } from 'react';
import { GOLD, NAVY } from './constants';
import { DashboardData, ATM } from './types';

// Components
import { CommandBar } from './components/CommandBar';
import { NewsTicker } from './components/NewsTicker';
import { GreetingPanel } from './components/GreetingPanel';
import { KPIStrip } from './components/KPIStrip';
import { AnnouncementFeed } from './components/AnnouncementFeed';

// Sidebar
import { AlertsPanel } from './components/Sidebar/AlertsPanel';
import { PulseWidget } from './components/Sidebar/PulseWidget';
import { PendingActions } from './components/Sidebar/PendingActions';
import { ATMMonitor } from './components/Sidebar/ATMMonitor';

interface DashboardProps {
    onNav: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNav }) => {
    const [data, setData] = useState<DashboardData>({
        srmMessage: null,
        tickers: [],
        announcements: [],
        kpis: [],
        branchPulse: { SURPASSED: 0, POSITIVE: 0, LAGGING: 0, NEGATIVE: 0 },
        lastUpdated: null,
        pendingActions: [],
        upcomingEvents: [],
        fyMetrics: {
            financialYear: '2025-26',
            fyWD: '0/0', fyPct: 0,
            qtr: '0/0', qtrPct: 0,
            month: '0/0', monthPct: 0,
            daysToFYEnd: 0
        },
        anniversaries: []
    });
    
    const [atms, setAtms] = useState<ATM[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [msgExpanded, setMsgExpanded] = useState(false);
    const [activeNotice, setActiveNotice] = useState<string | null>(null);
    const [announcementFilter, setAnnouncementFilter] = useState("ALL");

    useEffect(() => {
        const userStr = sessionStorage.getItem('user');
        const token = userStr ? JSON.parse(userStr).token : null;
        const headers = { Authorization: `Bearer ${token}` };

        setIsLoading(true);

        const fetchDashboard = fetch('/api/dashboard/config', { headers })
            .then(res => res.json())
            .then(resData => {
                if (resData.success) {
                    setData({
                        srmMessage: resData.srmMessage,
                        tickers: resData.tickers || [],
                        announcements: resData.announcements || [],
                        kpis: resData.kpis || [],
                        branchPulse: resData.branchPulse || { SURPASSED: 0, POSITIVE: 0, LAGGING: 0, NEGATIVE: 0 },
                        lastUpdated: resData.lastUpdated || null,
                        pendingActions: resData.pendingActions || [],
                        upcomingEvents: resData.upcomingEvents || [],
                        fyMetrics: resData.fyMetrics || data.fyMetrics,
                        anniversaries: resData.anniversaries || []
                    });
                }
            })
            .catch(console.error);

        const fetchAtms = fetch('/api/atms', { headers })
            .then(res => res.json())
            .then(resData => {
                setAtms(Array.isArray(resData) ? resData : []);
            })
            .catch(console.error);

        Promise.all([fetchDashboard, fetchAtms]).finally(() => setIsLoading(false));
    }, []);

    const lowCashAtms = atms.filter(a => a.balance < 50000).length;
    const urgentPendingCount = data.pendingActions.filter(a => a.urgent).length;
    const userRole = JSON.parse(sessionStorage.getItem('user') || '{}')?.role;

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500 font-medium tracking-wide">Connecting to Command Center...</div>;
    }

    return (
        <div className="flex flex-col font-sans text-slate-900 rounded-3xl bg-[#F8FAFC] relative shadow-[0_4px_32px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-y-auto" style={{
            minHeight: "calc(100vh - 120px)",
        }}>
            <CommandBar fyMetrics={data.fyMetrics} />
            <NewsTicker items={data.tickers} />

            <div className="flex-1 flex flex-col lg:flex-row min-h-0">
                {/* LEFT COLUMN: Main Content Area */}
                <div className="flex-1 flex flex-col p-6 lg:p-7 gap-6 min-w-0">
                    {data.srmMessage && (
                        <GreetingPanel 
                            srmMessage={data.srmMessage} 
                            msgExpanded={msgExpanded} 
                            setMsgExpanded={setMsgExpanded} 
                        />
                    )}

                    <KPIStrip kpis={data.kpis} />

                    <div className="flex-1 min-h-0">
                        <AnnouncementFeed 
                            announcements={data.announcements}
                            announcementFilter={announcementFilter}
                            setAnnouncementFilter={setAnnouncementFilter}
                            activeNotice={activeNotice}
                            setActiveNotice={setActiveNotice}
                        />
                    </div>
                </div>

                {/* RIGHT COLUMN: Actionable Intelligence */}
                <div className="w-full lg:w-[360px] flex flex-col p-6 lg:p-7 border-t lg:border-t-0 lg:border-l border-slate-200/80 bg-slate-50/50 gap-6 shrink-0">
                    <AlertsPanel anniversaries={data.anniversaries} />
                    
                    <PulseWidget 
                        branchPulse={data.branchPulse}
                        lastUpdated={data.lastUpdated}
                        atmsCount={atms.length}
                        lowCashAtms={lowCashAtms}
                        urgentPendingCount={urgentPendingCount}
                        fyMetrics={data.fyMetrics}
                    />

                    <PendingActions pendingActions={data.pendingActions} />

                    {userRole !== 'BRANCH_USER' && (
                        <button 
                            onClick={() => onNav('manuals')}
                            className="w-full p-4 bg-white rounded-2xl border border-dashed border-bank-gold/30 flex items-center gap-4 transition-all hover:bg-bank-gold/5 hover:border-bank-gold shadow-sm group"
                        >
                            <div className="w-12 h-12 bg-bank-gold/10 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📖</div>
                            <div className="flex-1 text-left">
                                <div className="text-[13px] font-black text-bank-navy uppercase tracking-tight">Department Manuals</div>
                                <div className="text-[11px] text-slate-400 font-bold mt-0.5">Maintain your Dept. SOPs & Activities</div>
                            </div>
                            <div className="text-xl text-bank-gold opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</div>
                        </button>
                    )}

                    <ATMMonitor atms={atms} />
                </div>
            </div>
        </div>
    );

};

export default Dashboard;
