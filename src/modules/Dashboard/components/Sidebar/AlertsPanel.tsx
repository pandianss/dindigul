import React from 'react';
import { AlertTriangle, Gift, ChevronRight } from 'lucide-react';
import { Milestone } from '../../types';
import { cn } from '../../../../utils/cn';

interface AlertsPanelProps {
    anniversaries: Milestone[];
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ anniversaries }) => {
    return (
        <div className="bg-white rounded-[28px] overflow-hidden shadow-[0_8px_30px_rgba(220,38,38,0.08)] border border-rose-100/60 transition-all hover:shadow-[0_12px_40px_rgba(220,38,38,0.12)]">
            <div className="bg-gradient-to-r from-[#DC2626] to-[#991B1B] px-5 py-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shadow-inner">
                    <AlertTriangle size={18} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                    <h3 className="text-[12px] font-black text-white uppercase tracking-[0.2em] leading-none">Command Alerts</h3>
                    <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-1">Real-time milestones & risk intel</p>
                </div>
                {anniversaries.length > 0 && (
                    <div className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-black text-white/90">
                        {anniversaries.length}
                    </div>
                )}
            </div>

            <div className="max-h-[260px] overflow-y-auto custom-scrollbar">
                {anniversaries.length === 0 ? (
                    <div className="p-10 text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 opacity-50">
                            <Gift size={24} className="text-slate-300" />
                        </div>
                        <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">No immidiate anniversaries</p>
                    </div>
                ) : (
                    anniversaries.map((ann, i) => (
                        <div key={ann.id} className={cn(
                            "group p-4 flex items-center gap-4 transition-all hover:bg-rose-50/50 cursor-default",
                            i < anniversaries.length - 1 && "border-b border-rose-50"
                        )}>
                            <div className="w-12 h-14 bg-white border-2 border-rose-50 rounded-xl relative overflow-hidden shadow-sm flex flex-col items-center justify-center transition-transform group-hover:scale-105">
                                <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />
                                <div className="text-[16px] font-black text-rose-600 leading-none mb-1">{ann.date.split(" ")[0]}</div>
                                <div className="text-[9px] font-black text-rose-400 uppercase tracking-tighter leading-none">{ann.date.split(" ")[1]}</div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-black text-bank-navy uppercase tracking-tight truncate leading-tight mb-1">
                                    {ann.name}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-rose-700/60 bg-rose-100/50 px-1.5 py-0.5 rounded-md uppercase tracking-wider">{ann.code}</span>
                                    <span className="w-1 h-1 rounded-full bg-rose-200" />
                                    <span className="text-[11px] font-bold text-slate-500">
                                        {ann.years}{getOrdinal(ann.years)} Anniversary
                                    </span>
                                </div>
                            </div>
                            
                            <ChevronRight size={14} className="text-rose-200 group-hover:text-rose-400 transition-colors" opacity={0.5} />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

function getOrdinal(n: number) {
    if (n % 100 >= 11 && n % 100 <= 13) return 'th';
    switch (n % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

