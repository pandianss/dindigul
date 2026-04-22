import React from 'react';
import { Calendar, Bell, Star, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { parseLocalISO } from '../../../utils/dateUtils';
import { MagazineNotice, MagazineEvent } from '../types';

interface DigestSectionsProps {
    events: MagazineEvent[];
    notices: MagazineNotice[];
    selectedMonth: Date;
}

export const DigestSections: React.FC<DigestSectionsProps> = ({ events, notices, selectedMonth }) => {
    return (
        <div className="p-12 space-y-16 bg-[#fcfcfc]">
            {/* Events Section */}
            <section>
                <div className="flex items-center space-x-3 mb-8 border-b-2 border-bank-navy/5 pb-3">
                    <Calendar className="text-bank-navy" size={28} />
                    <h3 className="text-2xl font-black text-bank-navy uppercase tracking-tighter">Regional Calendar</h3>
                </div>
                {events.length > 0 ? (
                    <div className="grid grid-cols-2 gap-6">
                        {events.map((event, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start space-x-5 hover:shadow-md transition-all">
                                <div className="bg-bank-navy/5 text-bank-navy p-4 rounded-xl flex flex-col items-center min-w-[70px]">
                                    <span className="text-2xl font-black leading-none">{format(parseLocalISO(event.date) || new Date(), 'dd')}</span>
                                    <span className="text-[10px] uppercase font-black mt-1 opacity-60">{format(parseLocalISO(event.date) || new Date(), 'EEE')}</span>
                                </div>
                                <div className="pt-1">
                                    <h4 className="font-black text-bank-navy text-lg leading-tight mb-2 tracking-tight">{event.name}</h4>
                                    <span className="text-[9px] font-black text-bank-gold uppercase tracking-[0.2em] bg-bank-gold/10 px-2 py-0.5 rounded-full">{event.type.replace('_', ' ')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-50 p-12 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
                        <Calendar className="mx-auto text-slate-300 mb-4 opacity-40" size={48} />
                        <p className="text-slate-400 font-bold italic text-sm">No specific events or holidays scheduled for this month.</p>
                    </div>
                )}
            </section>

            {/* Notices Section */}
            <section>
                <div className="flex items-center space-x-3 mb-8 border-b-2 border-bank-navy/5 pb-3">
                    <Bell className="text-bank-navy" size={28} />
                    <h3 className="text-2xl font-black text-bank-navy uppercase tracking-tighter">Circular Digest</h3>
                </div>
                {notices.length > 0 ? (
                    <div className="space-y-8">
                        {notices.map((notice, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all relative group">
                                <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Star className="text-bank-gold fill-bank-gold" size={24} />
                                </div>
                                <div className="flex items-center space-x-4 mb-4">
                                    <span className="bg-bank-navy text-[10px] font-black text-white px-2.5 py-1 rounded-lg uppercase tracking-widest">Doc #{idx + 1}</span>
                                    <h4 className="text-xl font-black text-bank-navy tracking-tight leading-tight">{notice.titleEn}</h4>
                                </div>
                                <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">{notice.contentEn}</p>
                                <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-50 pt-5">
                                    <span className="flex items-center gap-2"><Calendar size={12} /> Issued: {format(parseLocalISO(notice.createdAt) || new Date(notice.createdAt), 'dd MMM yyyy')}</span>
                                    <span className="text-bank-teal font-black">{notice.category}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-50 p-12 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
                        <Bell className="mx-auto text-slate-300 mb-4 opacity-40" size={48} />
                        <p className="text-slate-400 font-bold italic text-sm">No official circulars were issued during this period.</p>
                    </div>
                )}
            </section>

            {/* Statistics/Performance Section */}
            <section>
                <div className="flex items-center space-x-3 mb-8 border-b-2 border-bank-navy/5 pb-3">
                    <Star className="text-bank-gold" size={28} />
                    <h3 className="text-2xl font-black text-bank-navy uppercase tracking-tighter">Performance Spotlight</h3>
                </div>
                <div className="bg-gradient-to-br from-bank-navy to-slate-800 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full -mb-32 -mr-32 blur-3xl"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <h4 className="text-3xl font-black mb-1 tracking-tight">Dindigul City Branch</h4>
                            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-6">Top Performing Branch • {format(selectedMonth, 'MMMM yyyy')}</p>
                            <div className="flex space-x-12 mt-8">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-bank-gold mb-2 opacity-80">Target Growth</p>
                                    <p className="text-3xl font-black text-emerald-400">+14.2%</p>
                                </div>
                                <div className="h-12 w-px bg-white/10 mt-2"></div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-bank-gold mb-2 opacity-80">Recovery Asset</p>
                                    <p className="text-3xl font-black text-white">₹4.2 Cr</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-3xl p-8 rounded-[2rem] border border-white/10 shadow-inner">
                            <BarChart3 size={80} className="text-bank-gold opacity-80" />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
