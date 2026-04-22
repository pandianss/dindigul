import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../services/api';

// Types
import { MagazineNotice, MagazineEvent } from './types';

// Components
import { MagazineCover } from './components/MagazineCover';
import { DigestSections } from './components/DigestSections';

const MagazineGenerator: React.FC = () => {
    const { t } = useTranslation();
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [notices, setNotices] = useState<MagazineNotice[]>([]);
    const [events, setEvents] = useState<MagazineEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMonthData = async () => {
            setLoading(true);
            try {
                const [noticesRes, eventsRes] = await Promise.all([
                    api.get('/notices'),
                    api.get('/calendar/holidays')
                ]);

                const monthStr = format(selectedMonth, 'yyyy-MM');
                setNotices((noticesRes.data || []).filter((n: any) => n.createdAt.startsWith(monthStr)));
                setEvents((eventsRes.data || []).filter((e: any) => e.date.startsWith(monthStr)));
            } catch (error) {
                console.error('Error fetching magazine data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMonthData();
    }, [selectedMonth]);

    const handlePrint = () => window.print();

    return (
        <div className="space-y-8 pt-8 print:p-0 min-h-screen bg-[#f8f9fa] px-8 pb-12">
            {/* Control Bar */}
            <div className="flex items-center justify-between print:hidden max-w-6xl mx-auto w-full">
                <div>
                    <h2 className="text-3xl font-black text-bank-navy tracking-tight uppercase px-1">Operational Digest</h2>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1 px-1">Automated regional digest of events and announcements</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm">
                        <button
                            onClick={() => setSelectedMonth(prev => new Date(prev.setMonth(prev.getMonth() - 1)))}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-bank-navy"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="px-8 text-xs font-black text-bank-navy min-w-[160px] text-center uppercase tracking-widest">
                            {format(selectedMonth, 'MMMM yyyy')}
                        </span>
                        <button
                            onClick={() => setSelectedMonth(prev => new Date(prev.setMonth(prev.getMonth() + 1)))}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-bank-navy"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <button 
                        onClick={handlePrint} 
                        className="bg-bank-navy text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center space-x-3 hover:opacity-90 transition-all shadow-xl active:scale-95 shadow-bank-navy/20"
                    >
                        <Printer size={18} />
                        <span>Print Magazine</span>
                    </button>
                </div>
            </div>

            {/* Magazine Document */}
            <div className="bg-white rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden max-w-6xl mx-auto print:shadow-none print:border-none print:rounded-none animate-in fade-in slide-in-from-bottom-4 duration-700">
                <MagazineCover selectedMonth={selectedMonth} />

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40">
                        <div className="w-12 h-12 border-4 border-bank-navy/10 border-t-bank-navy rounded-full animate-spin mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-bank-navy opacity-40">Collating Regional Data...</p>
                    </div>
                ) : (
                    <DigestSections 
                        events={events}
                        notices={notices}
                        selectedMonth={selectedMonth}
                    />
                )}

                {/* Magazine Footer */}
                <div className="bg-white border-t border-slate-50 p-10 flex items-center justify-between">
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                        Bank Regional Office, Dindigul • Internal Communication Only
                    </div>
                    <div className="flex items-center space-x-3 text-bank-navy font-black text-xs uppercase tracking-widest">
                        <span className="opacity-40">{format(selectedMonth, 'yyyy')} Edition</span>
                        <div className="w-2 h-2 rounded-full bg-bank-gold shadow-sm shadow-bank-gold/40"></div>
                        <span>Reference Page 01</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MagazineGenerator;
