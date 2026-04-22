import React from 'react';
import { 
    Activity, 
    AlertCircle, 
    Building, 
    Calendar,
    ArrowRight
} from 'lucide-react';
import { FYMetrics } from '../../types';
import { cn } from '../../../../utils/cn';

interface PulseWidgetProps {
    branchPulse: Record<string, number>;
    lastUpdated: string | null;
    atmsCount: number;
    lowCashAtms: number;
    urgentPendingCount: number;
    fyMetrics: FYMetrics;
}

export const PulseWidget: React.FC<PulseWidgetProps> = ({
    branchPulse,
    lastUpdated,
    atmsCount,
    lowCashAtms,
    urgentPendingCount,
    fyMetrics
}) => {
    const pulseItems = [
        { label: "Surpassed", count: branchPulse.SURPASSED || 0, color: "bg-emerald-400" },
        { label: "Positive", count: branchPulse.POSITIVE || 0, color: "bg-sky-400" },
        { label: "Lagging", count: branchPulse.LAGGING || 0, color: "bg-amber-400" },
        { label: "Negative", count: branchPulse.NEGATIVE || 0, color: "bg-rose-400" },
    ];

    const totalPulseUnits = pulseItems.reduce((sum, item) => sum + item.count, 0);
    const leadingUnits = (branchPulse.SURPASSED || 0) + (branchPulse.POSITIVE || 0);
    const concernUnits = (branchPulse.LAGGING || 0) + (branchPulse.NEGATIVE || 0);
    const dominantPulse = [...pulseItems].sort((a, b) => b.count - a.count)[0];

    const branchPulseSummary = totalPulseUnits === 0
        ? "Performance snapshot pending MIS synchronization."
        : `${leadingUnits} of ${totalPulseUnits} units are stable or ahead. Overall trend is ${dominantPulse?.label || 'Stable'}.`;

    return (
        <div className="bg-gradient-to-br from-bank-navy to-[#162455] rounded-3xl p-6 shadow-[0_20px_48px_rgba(33,53,127,0.2)] border border-white/5 overflow-hidden group">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 text-bank-gold font-black text-[10px] uppercase tracking-[0.2em] mb-2 opacity-80">
                        <Activity size={14} className="animate-pulse" />
                        Branch Pulse
                    </div>
                    <div className="text-4xl font-black text-white tracking-tighter leading-none mb-1">
                        {totalPulseUnits || "--"}
                    </div>
                    <div className="text-[11px] text-white/40 font-bold uppercase tracking-wider">
                        Active In MIS
                    </div>
                </div>
                <div className={cn(
                    "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all duration-500",
                    concernUnits > 0 
                        ? "bg-rose-500/10 text-rose-300 border-rose-500/20" 
                        : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                )}>
                    {concernUnits > 0 ? `${concernUnits} UNDER REVIEW` : "OPERATIONAL HEALTHY"}
                </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-white/5 rounded-full -mr-6 -mt-6" />
                <p className="text-sm text-white/80 leading-relaxed font-bold tracking-tight relative z-10 italic">
                    {branchPulseSummary}
                </p>
                {lastUpdated && (
                    <div className="mt-3 flex items-center gap-2 text-[9px] text-white/30 font-black uppercase tracking-widest">
                        <ClockIcon />
                        Updated {new Date(lastUpdated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                {pulseItems.map(item => {
                    const share = totalPulseUnits > 0 ? Math.round((item.count / totalPulseUnits) * 100) : 0;
                    return (
                        <div key={item.label} className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 transition-all hover:bg-white/[0.06] hover:border-white/[0.1]">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <span className="text-[10px] text-white/40 font-black uppercase tracking-widest leading-none">
                                    {item.label}
                                </span>
                                <div className={cn("w-2 h-2 rounded-full", item.color)} />
                            </div>
                            <div className="text-2xl font-black text-white leading-none mb-1">
                                {item.count}
                            </div>
                            <div className="text-[10px] text-white/20 font-bold">
                                {share}% Share
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                {[
                    { icon: AlertCircle, label: "Urgent", val: urgentPendingCount, color: urgentPendingCount > 0 ? "text-rose-400" : "text-white/40" },
                    { icon: Building, label: "ATM Alerts", val: lowCashAtms, color: lowCashAtms > 0 ? "text-amber-400" : "text-white/40" },
                    { icon: Activity, label: "Issues", val: concernUnits, color: concernUnits > 0 ? "text-bank-gold" : "text-white/40" },
                    { icon: Calendar, label: "FY Days", val: fyMetrics.daysToFYEnd, color: "text-sky-400" },
                ].map((s, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-xl bg-white/5", s.color)}>
                            <s.icon size={16} />
                        </div>
                        <div>
                            <div className="text-[9px] text-white/30 font-black uppercase tracking-widest leading-none mb-1">{s.label}</div>
                            <div className={cn("text-lg font-black leading-none tracking-tighter", s.color)}>{s.val}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ClockIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
);

