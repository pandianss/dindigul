import React, { useState, useEffect } from 'react';
import { Bell, Search, Pin, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';

interface Notice {
    id: string;
    titleEn: string;
    contentEn: string;
    category: string;
    priority: string;
    isPinned: boolean;
    createdAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
    'OPERATIONAL': 'bg-blue-100 text-blue-700',
    'COMPLIANCE': 'bg-purple-100 text-purple-700',
    'HR': 'bg-green-100 text-green-700',
    'GENERAL': 'bg-gray-100 text-gray-700'
};

const NoticeBoard: React.FC = () => {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        api.get('/notices')
            .then(res => res.data)
            .then(data => {
                setNotices(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching notices:', err);
                setLoading(false);
            });
    }, []);

    const filteredNotices = notices.filter(n =>
        n.titleEn.toLowerCase().includes(filter.toLowerCase()) ||
        n.category.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-bank-navy tracking-tight uppercase">Operational Bulletins</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Regional circulars & announcements</p>
                </div>
                <div className="relative group">
                    <div className="absolute inset-0 bg-bank-navy/5 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-bank-navy transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Search bulletins..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="relative pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-bank-navy/20 focus:border-bank-navy outline-none w-full sm:w-64 shadow-sm text-xs font-medium transition-all"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bank-navy"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {filteredNotices.length > 0 ? (
                        filteredNotices.map(notice => (
                            <div key={notice.id} className={`card p-4 relative transition-all hover:shadow-md hover:border-bank-navy/20 ${notice.isPinned ? 'border-l-4 border-l-bank-gold' : ''}`}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center flex-wrap gap-2 mb-1">
                                            {notice.isPinned && <Pin size={14} className="text-bank-gold fill-bank-gold rotate-45 shrink-0" />}
                                            <h3 className="text-base font-black text-bank-navy truncate leading-tight">{notice.titleEn}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${CATEGORY_COLORS[notice.category] || 'bg-gray-100'}`}>
                                                    {notice.category}
                                                </span>
                                                {notice.priority === 'URGENT' && (
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest bg-red-100 text-red-700 animate-pulse">
                                                        Urgent
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 line-clamp-1 italic font-medium">{notice.contentEn}</p>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                                        <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={12} className="text-bank-teal" />
                                                <span>{format(new Date(notice.createdAt), 'dd MMM yyyy')}</span>
                                            </div>
                                            <div className="hidden sm:flex items-center gap-1.5">
                                                <Tag size={12} className="text-bank-gold" />
                                                <span>RO Admin</span>
                                            </div>
                                        </div>
                                        <button className="text-bank-navy font-black text-[10px] uppercase tracking-widest hover:text-bank-gold transition-colors underline underline-offset-4">View Detail</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 card bg-gray-50 border-dashed">
                            <Bell className="mx-auto text-gray-300 mb-2" size={32} />
                            <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">No bulletins active</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NoticeBoard;
