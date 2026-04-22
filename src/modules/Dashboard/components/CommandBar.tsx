import React from 'react';
import { ShieldCheck, Globe, Clock } from 'lucide-react';
import { FYMetrics } from '../types';
import { cn } from '../../utils';

interface CommandBarProps {
    fyMetrics: FYMetrics;
}

export const CommandBar: React.FC<CommandBarProps> = ({ fyMetrics }) => {
    return (
        <div className="bg-bank-navy px-8 py-4 flex items-center justify-between shadow-2xl relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-0 right-1/4 w-96 h-full bg-bank-gold/5 blur-[120px] pointer-events-none" />
            
            <div className="flex items-center gap-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-bank-gold/10 flex items-center justify-center text-bank-gold border border-bank-gold/20 shadow-inner group">
                        <ShieldCheck size={22} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                        <div className="text-lg font-black text-white tracking-tight leading-none uppercase">
                            Dindigul <span className="text-bank-gold">Regional Office</span>
                        </div>
                        <div className="text-[10px] text-white/30 font-black tracking-[0.25em] uppercase mt-1">
                            Operations Command Center
                        </div>
                    </div>
                </div>
                
                <div className="hidden xl:flex items-center gap-4 border-l border-white/10 pl-6 h-10">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                        <Globe size={14} className="text-bank-gold/60" />
                        <span className="text-[11px] font-black text-white/50 uppercase tracking-widest">FY {fyMetrics.financialYear}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-12 relative z-10">
                <div className="hidden lg:flex items-center gap-8">
                    {[
                        { label: "FY WD", val: fyMetrics.fyWD, pct: fyMetrics.fyPct },
                        { label: "QTR", val: fyMetrics.qtr, pct: fyMetrics.qtrPct },
                        { label: "MONTH", val: fyMetrics.month, pct: fyMetrics.monthPct },
                    ].map(w => (
                        <div key={w.label} className="group flex flex-col items-center">
                            <div className="text-[9px] font-black text-bank-gold/60 uppercase tracking-[0.2em] mb-1.5 group-hover:text-bank-gold transition-colors">{w.label}</div>
                            <div className="text-[13px] font-black text-white/90 font-mono tracking-tighter mb-2">{w.val}</div>
                            <div className="h-1 w-12 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-bank-gold shadow-[0_0_8px_rgba(201,168,76,0.5)] transition-all duration-1000" 
                                    style={{ width: `${w.pct}%` }} 
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-4 border-l border-white/10 pl-8 h-10">
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2 text-[12px] font-black text-white tracking-tight">
                            <Clock size={14} className="text-bank-gold/80" />
                            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">
                            {new Date().toLocaleDateString('en-IN', { weekday: 'long' })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

