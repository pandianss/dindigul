import React from 'react';
import { TrendingUp, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { MisSnapshot, SnapshotPanelData } from '../types';
import { formatValue, getStatusStyle } from '../utils';

interface PerformanceWidgetProps {
    snapshot: MisSnapshot;
}

const GrowthIndicator = ({ val, isInverse = false, isPercent = false }: { val: number, isInverse?: boolean, isPercent?: boolean }) => {
    if (Math.abs(val) < 0.01) return <span className="text-slate-200 font-medium">0.00</span>;
    const isPositive = isInverse ? val <= 0 : val >= 0;
    const colorClass = isPositive ? 'text-bank-teal' : 'text-rose-500';

    return (
        <div className={`flex items-center justify-end gap-0.5 ${colorClass}`}>
            <span className="font-bold text-[14px] font-mono tabular-nums tracking-tighter">{formatValue(Math.abs(val), isPercent)}</span>
            {val >= 0 ? <ArrowUpRight className="w-4 h-4 stroke-[2.5]" /> : <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />}
        </div>
    );
};

export const PerformanceWidget: React.FC<PerformanceWidgetProps> = ({ snapshot }) => {
    const plData = (snapshot.panelData || []).find(p => p.parameter === 'Branch_PL');
    const recData = (snapshot.panelData || []).find(p => p.parameter === 'Recovery');

    if (!plData && !recData) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-900 via-bank-navy to-[#1a237e] rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group mb-10 border border-white/10 ring-1 ring-white/5">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-48 -mt-48 blur-3xl group-hover:bg-indigo-400/20 transition-all duration-1000" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
                {/* Branch P&L Section */}
                {plData && (
                    <div className="flex flex-col gap-6 lg:pr-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl group-hover:scale-110 transition-transform duration-500">
                                    <TrendingUp className="w-7 h-7 text-indigo-300" />
                                </div>
                                <div>
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-200/50 mb-1 font-mono">Performance Stream</h2>
                                    <div className="text-2xl font-black tracking-tight flex items-center gap-3">
                                        {plData.metadata.displayName}
                                        <span className={`text-[9px] px-2 py-0.5 rounded-lg border uppercase tracking-widest font-black ${getStatusStyle(plData.status)} border-white/20 shadow-sm`}>{plData.status}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 rounded-2xl p-5 border border-white/5 backdrop-blur-sm shadow-inner group-hover/row:bg-white/10 transition-all">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200/60 mb-1.5 underline decoration-indigo-500/30 underline-offset-4">Actual P&L</p>
                                <p className="text-3xl font-black tracking-tighter text-white">
                                    {formatValue(plData.val_current)}
                                </p>
                                <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-indigo-200/40">
                                    <span>Budget: {formatValue(plData.budget_month)}</span>
                                    <span className={plData.gap_month >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                        Gap: {formatValue(plData.gap_month)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col justify-end gap-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200/40 text-right mb-1">P&L Trajectory</p>
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[11px] font-bold text-indigo-200/60 uppercase tracking-tighter">Daily Var</span>
                                        <GrowthIndicator val={plData.growth_day} isPercent={false} />
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-[11px] font-bold text-indigo-200/60 uppercase tracking-tighter">FY Target Gap</span>
                                        <p className={`text-sm font-black ${plData.gap_quarter >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {formatValue(plData.gap_quarter)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recovery Section */}
                {recData && (() => {
                    const q1 = (snapshot.panelData || []).find(p => p.parameter === 'Rec_Q1')?.val_current || 0;
                    const q2 = (snapshot.panelData || []).find(p => p.parameter === 'Rec_Q2')?.val_current || 0;
                    const q3 = (snapshot.panelData || []).find(p => p.parameter === 'Rec_Q3')?.val_current || 0;
                    const q4 = (snapshot.panelData || []).find(p => p.parameter === 'Rec_Q4')?.val_current || 0;

                    return (
                        <div className="flex flex-col gap-6 lg:pl-10 pt-10 lg:pt-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl group-hover:scale-110 transition-transform duration-500">
                                        <RefreshCw className="w-7 h-7 text-emerald-300" />
                                    </div>
                                    <div>
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-200/50 mb-1 font-mono">Asset Recovery</h2>
                                        <div className="text-2xl font-black tracking-tight flex items-center gap-3">
                                            {recData.metadata.displayName}
                                            <span className={`text-[9px] px-2 py-0.5 rounded-lg border uppercase tracking-widest font-black ${getStatusStyle(recData.status)} border-white/20 shadow-sm`}>{recData.status}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-2xl p-5 border border-white/5 backdrop-blur-sm shadow-inner group-hover/row:bg-white/10 transition-all">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200/60 mb-1.5 underline decoration-emerald-500/30 underline-offset-4">Actual Recovery</p>
                                    <p className="text-3xl font-black tracking-tighter text-white">
                                        {formatValue(recData.val_current)}
                                    </p>
                                    <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-emerald-200/40">
                                        <span>Budget: {formatValue(recData.budget_month)}</span>
                                        <span className={recData.gap_month >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                            Gap: {formatValue(recData.gap_month)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col justify-end gap-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200/40 text-right mb-1">Recovery Trajectory</p>
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-bold text-emerald-200/60 uppercase tracking-tighter">Daily Var</span>
                                            <GrowthIndicator val={recData.growth_day} isPercent={false} />
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[11px] font-bold text-emerald-200/60 uppercase tracking-tighter">FY Target Gap</span>
                                            <p className={`text-sm font-black ${recData.gap_quarter >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {formatValue(recData.gap_quarter)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quarterly Performance Breakdown */}
                            <div className="mt-4 bg-white/5 rounded-2xl p-4 border border-white/10 ring-1 ring-white/5 shadow-lg group-hover:bg-white/10 transition-all">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/50 mb-4 font-mono flex items-center gap-2">
                                    <RefreshCw className="w-3 h-3" />
                                    Quarterly Performance Breakdown
                                </p>
                                <div className="grid grid-cols-4 gap-3 text-center">
                                    {[
                                        { label: 'Q1', val: q1 },
                                        { label: 'Q2', val: q2 },
                                        { label: 'Q3', val: q3 },
                                        { label: 'Q4', val: q4 }
                                    ].map((q) => (
                                        <div key={q.label} className={`rounded-xl p-3 border border-white/5 backdrop-blur-sm ${q.val > 0 ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
                                            <p className="text-[9px] font-black text-emerald-200/40 uppercase mb-1">{q.label}</p>
                                            <p className={`text-md font-black tracking-tight ${q.val > 0 ? 'text-emerald-300' : 'text-slate-500'}`}>
                                                {formatValue(q.val)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};
