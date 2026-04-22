import React from 'react';
import { Shield } from 'lucide-react';

interface AssessmentSummaryProps {
    premiumAmount: number;
    gstAmount: number;
    totalPayable: number;
}

export const AssessmentSummary: React.FC<AssessmentSummaryProps> = ({
    premiumAmount,
    gstAmount,
    totalPayable
}) => {
    return (
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <Shield size={80} />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 mb-6 font-['Outfit']">Payment Assessment</h4>
            <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                    <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">Premium (0.06%)</p>
                        <p className="text-lg font-black text-white">₹{premiumAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-right space-y-1">
                        <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">GST (18%)</p>
                        <p className="text-base font-bold text-white/80">₹{gstAmount.toLocaleString('en-IN')}</p>
                    </div>
                </div>
                <div className="pt-2">
                    <p className="text-[10px] font-black uppercase text-indigo-300 mb-1 tracking-widest">Total Payable</p>
                    <p className="text-3xl font-black text-white tracking-tighter">₹{totalPayable.toLocaleString('en-IN')}</p>
                    <p className="text-[9px] text-white/30 italic mt-2 font-medium leading-relaxed">Exact remittance rounded to 2 decimal places as per DICGC circular. Assessable total derived from Form DI-01.</p>
                </div>
            </div>
        </div>
    );
};
