import React from 'react';
import { Zap, FileText, ClipboardCheck, Timer } from 'lucide-react';
import { ActionItem } from '../../types';
import { cn } from '../../../../utils/cn';

interface PendingActionsProps {
    pendingActions: ActionItem[];
}

export const PendingActions: React.FC<PendingActionsProps> = ({ pendingActions }) => {
    const urgentCount = pendingActions.filter(a => a.urgent).length;

    return (
        <div className="bg-white rounded-[28px] overflow-hidden shadow-[0_8px_30px_rgba(33,53,127,0.06)] border border-slate-200/60 transition-all hover:shadow-[0_12px_40px_rgba(33,53,127,0.1)]">
            <div className="bg-bank-navy px-5 py-4 flex items-center gap-3 border-b border-white/5">
                <div className="w-8 h-8 rounded-xl bg-bank-gold/20 flex items-center justify-center text-bank-gold shadow-inner">
                    <Zap size={18} strokeWidth={2.5} className="fill-bank-gold/20" />
                </div>
                <div className="flex-1">
                    <h3 className="text-[12px] font-black text-white uppercase tracking-[0.2em] leading-none">Task Queue</h3>
                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1">Pending action intelligence</p>
                </div>
                {urgentCount > 0 && (
                    <div className="bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/20 text-[9px] font-black text-rose-400 uppercase tracking-tighter">
                        {urgentCount} Priority
                    </div>
                )}
            </div>

            <div className="divide-y divide-slate-100">
                {pendingActions.length === 0 ? (
                    <div className="p-10 text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 opacity-50">
                            <ClipboardCheck size={24} className="text-slate-300" />
                        </div>
                        <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">All tasks clear</p>
                    </div>
                ) : (
                    pendingActions.map((a, i) => {
                        const isAudit = a.type === 'AUDIT';
                        return (
                            <div key={a.id} className={cn(
                                "group p-4 flex items-start gap-4 transition-all hover:bg-slate-50/80 cursor-default",
                                a.urgent && "bg-amber-50/30"
                            )}>
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 shadow-sm",
                                    isAudit 
                                        ? "bg-sky-50 border-sky-100 text-sky-600" 
                                        : "bg-amber-50 border-amber-100 text-amber-600"
                                )}>
                                    {isAudit ? <ClipboardCheck size={18} /> : <FileText size={18} />}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1.5">{a.type}</div>
                                    <div className="text-[13px] font-black text-bank-navy uppercase tracking-tight truncate leading-tight mb-0.5">
                                        {a.branch}
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium truncate opacity-70 italic">{a.param}</p>
                                </div>

                                <div className="text-right flex flex-col items-end gap-2 shrink-0">
                                    <div className={cn(
                                        "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black tracking-tighter",
                                        a.urgent ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-500"
                                    )}>
                                        <Timer size={12} />
                                        {a.due}
                                    </div>
                                    <div className={cn(
                                        "text-[9px] font-black tracking-[0.12em] uppercase leading-none px-1.5 py-0.5 rounded-md",
                                        a.status === "READY" ? "bg-emerald-50 text-emerald-600" :
                                        a.status === "DRAFT" || a.status === 'PENDING' ? "bg-amber-50 text-amber-600" :
                                        "bg-slate-50 text-slate-400"
                                    )}>
                                        {a.status}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

