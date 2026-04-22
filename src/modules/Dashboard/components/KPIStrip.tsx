import React from 'react';
import { 
    PiggyBank, 
    Building2, 
    Wallet, 
    Clock, 
    TrendingUp, 
    BarChart,
    ArrowUpRight,
    ArrowDownRight,
    Minus
} from 'lucide-react';
import { KPIEntry } from '../types';
import { cn } from '../../../utils/cn';

interface KPIStripProps {
    kpis: KPIEntry[];
}

const KPI_ICONS: Record<string, React.ElementType> = {
    'SB': PiggyBank,
    'CD': Building2,
    'CASA': Wallet,
    'TD': Clock,
    'Adv': TrendingUp,
    'Bus': BarChart,
};

export const KPIStrip: React.FC<KPIStripProps> = ({ kpis }) => {
    if (kpis.length === 0) {
        return (
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 text-center border border-dashed border-slate-200">
                <div className="text-3xl mb-3">📊</div>
                <h3 className="text-slate-900 font-black text-sm uppercase tracking-wider">No Performance Data</h3>
                <p className="text-slate-400 text-[11px] font-bold mt-1">Upload branch MIS data in settings to view KPIs.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpis.slice(0, 6).map((k, i) => {
                const Icon = KPI_ICONS[k.code] || BarChart;
                const isPositive = k.growth > 0;
                const isNeutral = k.growth === 0;

                return (
                    <div 
                        key={i} 
                        className="group relative bg-white p-5 rounded-[24px] border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_24px_rgba(33,53,127,0.08)] hover:-translate-y-1 overflow-hidden"
                    >
                        {/* Decorative background element */}
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500" />
                        
                        <div className="relative flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className={cn(
                                    "p-2.5 rounded-xl flex items-center justify-center transition-colors duration-300",
                                    isPositive ? "bg-emerald-50 text-emerald-600" : 
                                    isNeutral ? "bg-slate-50 text-slate-400" : "bg-rose-50 text-rose-600"
                                )}>
                                    <Icon size={20} strokeWidth={2.5} />
                                </div>
                                <div className={cn(
                                    "flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-black tracking-tighter transition-all",
                                    isPositive ? "bg-emerald-100/50 text-emerald-700" :
                                    isNeutral ? "bg-slate-100/50 text-slate-500" : "bg-rose-100/50 text-rose-700"
                                )}>
                                    {isPositive ? <ArrowUpRight size={12} /> : 
                                     isNeutral ? <Minus size={12} /> : <ArrowDownRight size={12} />}
                                    {k.pace ? `${Math.abs(k.pace)}%` : '0%'}
                                </div>
                            </div>

                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-2">
                                    {k.label}
                                </div>
                                <div className="text-xl font-black text-bank-navy tracking-tight truncate leading-none">
                                    {k.val}
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-50 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className={cn(
                                        "text-[10px] font-black tracking-tight",
                                        k.dailyGrowth > 0 ? "text-emerald-600/80" : 
                                        k.dailyGrowth === 0 ? "text-slate-400" : "text-rose-600/80"
                                    )}>
                                        {k.dailyGrowthDisplay}
                                    </div>
                                    <div className="text-[8px] font-black text-slate-300/80 uppercase tracking-widest leading-none">
                                        DAILY
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className={cn(
                                        "text-[10px] font-black tracking-tight",
                                        k.growth > 0 ? "text-emerald-600/80" : 
                                        k.growth === 0 ? "text-slate-400" : "text-rose-600/80"
                                    )}>
                                        {k.growthDisplay}
                                    </div>
                                    <div className="text-[8px] font-black text-slate-300/80 uppercase tracking-widest leading-none">
                                        FY OPEN
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

