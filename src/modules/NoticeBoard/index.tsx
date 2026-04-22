import React, { useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { useNotices } from '../../hooks/api/useNotices';

// Components
import { NoticeCard } from './components/NoticeCard';

const NoticeBoard: React.FC = () => {
    const { notices, loading, error, acknowledge } = useNotices();
    const [filter, setFilter] = useState('');

    const filteredNotices = notices.filter(n =>
        n.titleEn.toLowerCase().includes(filter.toLowerCase()) ||
        n.category.toLowerCase().includes(filter.toLowerCase())
    );

    const handleAcknowledge = async (id: string) => {
        try {
            await acknowledge(id);
        } catch (err) {
            console.error('Failed to acknowledge:', err);
        }
    };

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-100 p-8 rounded-[2rem] text-center">
                <p className="text-rose-600 font-black uppercase tracking-widest text-[11px]">Terminal Error</p>
                <p className="text-rose-700 font-bold mt-1">Failed to connect to bulletin server: {error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 px-1">
                <div>
                    <h2 className="text-3xl font-black text-bank-navy tracking-tighter uppercase leading-none">Operational Bulletins</h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-3">Regional circulars, critical updates & official announcements</p>
                </div>
                <div className="relative group">
                    <div className="absolute inset-0 bg-bank-navy/5 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-bank-navy transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search bulletins..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="relative pl-12 pr-6 py-3.5 bg-white border border-slate-100 rounded-[1.25rem] focus:ring-4 focus:ring-bank-navy/5 focus:border-bank-navy outline-none w-full sm:w-80 shadow-sm text-xs font-black uppercase tracking-wider transition-all"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-white rounded-[2rem] border border-slate-50 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredNotices.length > 0 ? (
                        filteredNotices.map(notice => (
                            <NoticeCard 
                                key={notice.id} 
                                notice={notice as any} 
                                onAcknowledge={handleAcknowledge} 
                            />
                        ))
                    ) : (
                        <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 shadow-inner">
                            <Bell className="mx-auto text-slate-200 mb-4 opacity-40 hover:scale-110 transition-transform cursor-pointer" size={64} />
                            <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Transmission Clear • No active bulletins</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NoticeBoard;
