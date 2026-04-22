import React from 'react';
import { BookOpen } from 'lucide-react';
import { format } from 'date-fns';

interface MagazineCoverProps {
    selectedMonth: Date;
}

export const MagazineCover: React.FC<MagazineCoverProps> = ({ selectedMonth }) => {
    return (
        <div className="bg-bank-navy p-12 text-white relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-bank-gold/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="relative z-10">
                <div className="flex items-center space-x-4 mb-6">
                    <BookOpen size={48} className="text-bank-gold" />
                    <div className="h-12 w-px bg-white/20"></div>
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Regional Monthly</h1>
                        <p className="text-bank-gold font-black text-xs uppercase tracking-[0.4em] mt-1 opacity-80">Dindigul Regional Office</p>
                    </div>
                </div>
                <div className="flex items-end justify-between border-t border-white/20 pt-12 mt-24">
                    <div>
                        <h4 className="text-6xl font-black leading-none mb-2 tracking-tighter">{format(selectedMonth, 'MMMM')}</h4>
                        <p className="text-2xl font-bold text-white/50 tracking-widest">{format(selectedMonth, 'yyyy')}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-bank-gold mb-1 opacity-60">Issue No.</p>
                        <p className="text-3xl font-black tracking-tighter">{`#2026-${format(selectedMonth, 'MM')}`}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
