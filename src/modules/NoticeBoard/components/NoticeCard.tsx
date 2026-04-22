import React from 'react';
import { Pin, Calendar, Tag, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Notice } from '../types';

interface NoticeCardProps {
    notice: Notice;
    onAcknowledge: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    'OPERATIONAL': 'bg-blue-100 text-blue-700',
};

export const NoticeCard: React.FC<NoticeCardProps> = ({ notice, onAcknowledge }) => {
    return (
        <div className={`bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm relative transition-all hover:shadow-xl hover:border-bank-navy/10 ${notice.isPinned ? 'border-l-4 border-l-bank-gold' : ''}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-3 mb-2">
                        {notice.isPinned && <Pin size={16} className="text-bank-gold fill-bank-gold rotate-45 shrink-0" />}
                        <h3 className="text-lg font-black text-bank-navy truncate leading-tight tracking-tight">{notice.titleEn}</h3>
                        <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${CATEGORY_COLORS[notice.category] || 'bg-slate-100 text-slate-500 font-black'}`}>
                                {notice.category}
                            </span>
                            {notice.priority === 'URGENT' && (
                                <span className="text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100 animate-pulse">
                                    Urgent Bulletin
                                </span>
                            )}
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 italic font-medium leading-relaxed">{notice.contentEn}</p>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-8 shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-50">
                    <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-bank-teal opacity-60" />
                            <span>{format(new Date(notice.createdAt), 'dd MMM yyyy')}</span>
                        </div>
                        <div className="hidden sm:flex items-center gap-2">
                            <Tag size={14} className="text-bank-gold opacity-60" />
                            <span>RO Admin</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {notice.requiresAck && !notice.hasAcknowledged ? (
                            <button
                                onClick={() => onAcknowledge(notice.id)}
                                className="flex items-center gap-2 px-4 py-1.5 bg-bank-teal text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-bank-teal/20 transition-all active:scale-95"
                            >
                                <CheckCircle size={14} />
                                Acknowledge
                            </button>
                        ) : notice.requiresAck && notice.hasAcknowledged ? (
                            <span className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                                <CheckCircle size={14} />
                                Acknowledged
                            </span>
                        ) : null}
                        <button className="text-bank-navy font-black text-[10px] uppercase tracking-widest hover:text-bank-gold transition-colors border-b-2 border-transparent hover:border-bank-gold pb-0.5">Details</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
