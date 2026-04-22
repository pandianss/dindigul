import React from 'react';
import { Users, TrendingUp } from 'lucide-react';
import { AnalyticsData } from '../types';
import { formatNumber, formatCurrency } from '../utils';
import { cn } from '../../../utils/cn';

interface StatsSummaryProps {
    stats: AnalyticsData | null;
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ stats }) => {
    // Calculative Layer for Relatability
    const calculateProgress = (current: number, previous: number) => {
        if (!previous) return 100;
        const progressFactor = (stats?.workingDays?.thisMonth || 1) / (stats?.workingDays?.lastMonth || 1);
        const benchmark = previous * progressFactor;
        return Math.min(Math.round((current / (benchmark || 1)) * 100), 150);
    };

    const sbProgress = calculateProgress(stats?.sb?.thisMonth || 0, stats?.sb?.lastMonthTotal || 0);
    const cdProgress = calculateProgress(stats?.cd?.thisMonth || 0, stats?.cd?.lastMonthTotal || 0);

    return (
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SB Analytics with Relatable Speedometer */}
            <div className="card p-6 space-y-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-bank-teal/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-bank-teal/10 transition-colors" />
                
                <div className="flex items-center justify-between relative z-10">
                    <div className="p-2 bg-bank-teal/10 rounded-lg text-bank-teal">
                        <Users size={20} />
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-bank-teal bg-bank-teal/5 px-2 py-1 rounded">SB PERFORMANCE HUB</span>
                        <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Target Threshold: {formatCurrency(stats?.sbThreshold || 0)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-6 relative z-10">
                    {/* Progress speedometer */}
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                            <circle 
                                cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                strokeDasharray={251.2}
                                strokeDashoffset={251.2 - (251.2 * sbProgress) / 100}
                                className={cn("transition-all duration-1000 ease-out", sbProgress >= 100 ? "text-bank-teal" : "text-bank-gold")}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-black text-bank-navy leading-none">{sbProgress}%</span>
                            <span className="text-[7px] font-black uppercase text-gray-400">of Bench</span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-1">
                        <h4 className="text-4xl font-black text-bank-navy tracking-tighter leading-none">{formatNumber(stats?.sb?.net)}</h4>
                        <div className="flex flex-col">
                            <p className="text-[11px] font-black text-bank-teal uppercase tracking-widest leading-none">Net Growth</p>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="flex -space-x-1">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-4 h-4 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
                                            <Users size={8} className="text-gray-400" />
                                        </div>
                                    ))}
                                </div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                    {formatNumber(stats?.sb?.thisMonth)} Qualified
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Net Funnel Line */}
                <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                    <div style={{ width: `${(stats?.sb?.thisMonth / (stats?.sb?.total || 1)) * 100}%` }} className="h-full bg-bank-teal" title="Qualified" />
                    <div style={{ width: `${(stats?.sb?.closed / (stats?.sb?.total || 1)) * 100}%` }} className="h-full bg-red-400" title="Closed" />
                </div>
                <div className="flex justify-between text-[7px] font-black uppercase tracking-widest text-gray-400">
                    <span>{formatNumber(stats?.sb?.total)} Opened</span>
                    <span>{formatNumber(stats?.sb?.closed)} Closed</span>
                </div>

                <div className="pt-2 grid grid-cols-2 gap-y-4 gap-x-6 relative z-10">
                    <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Growth Balance</p>
                        <div className="mt-0.5 font-black text-bank-teal tracking-tight text-base font-mono">{formatCurrency(stats?.sb?.thisMonthBalance)}</div>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">FY Cumulative</p>
                        <div className="mt-0.5 font-black text-bank-navy tracking-tight text-base font-mono">{formatCurrency(stats?.sb?.fyBalance)}</div>
                    </div>
                </div>
            </div>

            {/* CD Analytics with Similar Visuals */}
            <div className="card p-6 space-y-4 relative overflow-hidden group border-l-4 border-l-bank-gold">
                <div className="absolute top-0 right-0 w-32 h-32 bg-bank-gold/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                
                <div className="flex items-center justify-between relative z-10">
                    <div className="p-2 bg-bank-gold/10 rounded-lg text-bank-gold">
                        <TrendingUp size={20} />
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-bank-gold bg-bank-gold/5 px-2 py-1 rounded">CD PERFORMANCE HUB</span>
                        <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Threshold: {formatCurrency(stats?.cdThreshold || 0)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-6 relative z-10">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                            <circle 
                                cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                strokeDasharray={251.2}
                                strokeDashoffset={251.2 - (251.2 * cdProgress) / 100}
                                className={cn("transition-all duration-1000 ease-out", cdProgress >= 100 ? "text-bank-gold" : "text-bank-navy/20")}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-black text-bank-navy leading-none">{cdProgress}%</span>
                            <span className="text-[7px] font-black uppercase text-gray-400">of Bench</span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-1">
                        <h4 className="text-4xl font-black text-bank-navy tracking-tighter leading-none">{formatNumber(stats?.cd?.net)}</h4>
                        <div className="flex flex-col">
                            <p className="text-[11px] font-black text-bank-gold uppercase tracking-widest leading-none">Net Growth</p>
                            <div className="flex items-center gap-2 mt-3">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                    {formatNumber(stats?.cd?.thisMonth)} Qualified
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                    <div style={{ width: `${(stats?.cd?.thisMonth / (stats?.cd?.total || 1)) * 100}%` }} className="h-full bg-bank-gold" title="Qualified" />
                    <div style={{ width: `${(stats?.cd?.closed / (stats?.cd?.total || 1)) * 100}%` }} className="h-full bg-red-400" title="Closed" />
                </div>
                <div className="flex justify-between text-[7px] font-black uppercase tracking-widest text-gray-400">
                    <span>{formatNumber(stats?.cd?.total)} Opened</span>
                    <span>{formatNumber(stats?.cd?.closed)} Closed</span>
                </div>

                <div className="pt-2 grid grid-cols-2 gap-y-4 gap-x-6 relative z-10">
                    <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Growth Balance</p>
                        <div className="mt-0.5 font-black text-bank-gold tracking-tight text-base font-mono">{formatCurrency(stats?.cd?.thisMonthBalance)}</div>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">FY Cumulative</p>
                        <div className="mt-0.5 font-black text-bank-navy tracking-tight text-base font-mono">{formatCurrency(stats?.cd?.fyBalance)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
