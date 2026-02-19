import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BookOpen,
    Printer,
    Calendar,
    Bell,
    ChevronLeft,
    ChevronRight,
    Star,
    BarChart3
} from 'lucide-react';
import { format } from 'date-fns';

interface MagazineNotice {
    id: string;
    titleEn: string;
    contentEn: string;
    category: string;
    createdAt: string;
}

interface MagazineEvent {
    id: string;
    name: string;
    date: string;
    type: string;
}

const MagazineGenerator: React.FC = () => {
    const { t } = useTranslation();
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [notices, setNotices] = useState<MagazineNotice[]>([]);
    const [events, setEvents] = useState<MagazineEvent[]>([]);

    useEffect(() => {
        const fetchMonthData = async () => {
            try {
                const [noticesRes, eventsRes] = await Promise.all([
                    fetch('http://localhost:5000/api/notices'),
                    fetch('http://localhost:5000/api/calendar/holidays')
                ]);

                const allNotices = await noticesRes.json();
                const allEvents = await eventsRes.json();

                const monthStr = format(selectedMonth, 'yyyy-MM');
                setNotices(allNotices.filter((n: any) => n.createdAt.startsWith(monthStr)));
                setEvents(allEvents.filter((e: any) => e.date.startsWith(monthStr)));
            } catch (error) {
                console.error('Error fetching magazine data:', error);
            }
        };

        fetchMonthData();
    }, [selectedMonth]);

    const handlePrint = () => window.print();

    return (
        <div className="space-y-6 pt-6 print:p-0">
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy font-bank-noto">{t('nav.magazine')}</h2>
                    <p className="text-gray-500 text-sm">Automated regional digest of events and announcements</p>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                        <button
                            onClick={() => setSelectedMonth(prev => new Date(prev.setMonth(prev.getMonth() - 1)))}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="px-4 text-sm font-bold text-bank-navy min-w-[140px] text-center">
                            {format(selectedMonth, 'MMMM yyyy')}
                        </span>
                        <button
                            onClick={() => setSelectedMonth(prev => new Date(prev.setMonth(prev.getMonth() + 1)))}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    <button onClick={handlePrint} className="btn-primary flex items-center space-x-2 bg-bank-navy text-white px-4 py-2 rounded-lg">
                        <Printer size={18} />
                        <span>Print Magazine</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden max-w-5xl mx-auto print:shadow-none print:border-none">
                <div className="bg-bank-navy p-12 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-bank-gold/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-center space-x-3 mb-6">
                            <BookOpen size={40} className="text-bank-gold" />
                            <div className="h-10 w-px bg-white/20"></div>
                            <div>
                                <h1 className="text-3xl font-black uppercase tracking-tighter">Regional Monthly</h1>
                                <p className="text-bank-gold font-bold text-xs uppercase tracking-[0.3em]">Dindigul Regional Office</p>
                            </div>
                        </div>
                        <div className="flex items-end justify-between border-t border-white/20 pt-8 mt-20">
                            <div>
                                <h4 className="text-5xl font-black leading-none mb-2">{format(selectedMonth, 'MMMM')}</h4>
                                <p className="text-xl font-medium text-white/60">{format(selectedMonth, 'yyyy')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold uppercase tracking-widest text-bank-gold mb-1">Issue No.</p>
                                <p className="text-2xl font-black">{`#2026-${format(selectedMonth, 'MM')}`}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-12 space-y-12 bg-[#fafafa]">
                    <section>
                        <div className="flex items-center space-x-3 mb-6 border-b-2 border-bank-navy/10 pb-2">
                            <Calendar className="text-bank-navy" size={24} />
                            <h3 className="text-xl font-black text-bank-navy uppercase tracking-tight">Regional Calendar & Events</h3>
                        </div>
                        {events.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                                {events.map((event, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start space-x-4">
                                        <div className="bg-bank-navy/5 text-bank-navy p-3 rounded-lg flex flex-col items-center min-w-[60px]">
                                            <span className="text-lg font-black leading-none">{format(new Date(event.date), 'dd')}</span>
                                            <span className="text-[10px] uppercase font-bold">{format(new Date(event.date), 'EEE')}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-bank-navy leading-tight mb-1">{event.name}</h4>
                                            <span className="text-[10px] font-black text-bank-gold uppercase tracking-widest bg-bank-gold/5 px-1.5 py-0.5 rounded">{event.type.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-gray-100/50 p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                                <Calendar className="mx-auto text-gray-300 mb-2" size={32} />
                                <p className="text-gray-400 font-medium italic text-sm">No specific events or holidays scheduled for this month.</p>
                            </div>
                        )}
                    </section>

                    <section>
                        <div className="flex items-center space-x-3 mb-6 border-b-2 border-bank-navy/10 pb-2">
                            <Bell className="text-bank-navy" size={24} />
                            <h3 className="text-xl font-black text-bank-navy uppercase tracking-tight">Circulars & Announcements</h3>
                        </div>
                        {notices.length > 0 ? (
                            <div className="space-y-6">
                                {notices.map((notice, idx) => (
                                    <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-bank-teal/30 transition-all relative group">
                                        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Star className="text-bank-gold fill-bank-gold" size={18} />
                                        </div>
                                        <div className="flex items-center space-x-3 mb-3">
                                            <span className="bg-bank-navy text-[10px] font-black text-white px-2 py-0.5 rounded uppercase tracking-widest">#{idx + 1}</span>
                                            <h4 className="text-lg font-bold text-bank-navy">{notice.titleEn}</h4>
                                        </div>
                                        <p className="text-gray-600 text-sm leading-relaxed mb-4">{notice.contentEn}</p>
                                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            <span>Issued: {format(new Date(notice.createdAt), 'dd MMM yyyy')}</span>
                                            <span className="text-bank-teal">{notice.category}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-gray-100/50 p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                                <Bell className="mx-auto text-gray-300 mb-2" size={32} />
                                <p className="text-gray-400 font-medium italic text-sm">No official circulars were issued during this period.</p>
                            </div>
                        )}
                    </section>

                    <section>
                        <div className="flex items-center space-x-3 mb-6 border-b-2 border-bank-navy/10 pb-2">
                            <Star className="text-bank-gold" size={24} />
                            <h3 className="text-xl font-black text-bank-navy uppercase tracking-tight">Regional Performance Spotlight</h3>
                        </div>
                        <div className="bg-gradient-to-br from-bank-navy to-bank-teal p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
                            <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full -mb-24 -mr-24 blur-xl"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <h4 className="text-2xl font-black mb-1">Dindigul City Branch</h4>
                                    <p className="text-white/70 text-sm mb-4">Top Performing Branch - {format(selectedMonth, 'MMMM yyyy')}</p>
                                    <div className="flex space-x-8 mt-6">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-bank-gold mb-1">Growth</p>
                                            <p className="text-xl font-black">+14.2%</p>
                                        </div>
                                        <div className="h-10 w-px bg-white/20"></div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-bank-gold mb-1">Recovery</p>
                                            <p className="text-xl font-black">₹4.2 Cr</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                                    <BarChart3 size={64} className="text-bank-gold" />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="bg-white border-t border-gray-100 p-8 flex items-center justify-between">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Bank Regional Office, Dindigul • Internal Communication Only
                    </div>
                    <div className="flex items-center space-x-2 text-bank-navy font-black text-sm uppercase">
                        <span>{format(selectedMonth, 'yyyy')} Edition</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-bank-gold"></div>
                        <span>Page 01</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MagazineGenerator;
