import React from 'react';
import { Building2, Download } from 'lucide-react';
import { User } from '../../types';

interface ReportGeneratorProps {
    selectedMonth: string;
    setSelectedMonth: (m: string) => void;
    preparerId: string;
    setPreparerId: (id: string) => void;
    signatoryId: string;
    setSignatoryId: (id: string) => void;
    staff: User[];
    onGenerate: () => void;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
    selectedMonth,
    setSelectedMonth,
    preparerId,
    setPreparerId,
    signatoryId,
    setSignatoryId,
    staff,
    onGenerate
}) => {
    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 space-y-8">
            <div className="flex items-center gap-4">
                <Building2 className="text-indigo-600"/>
                <h3 className="font-black text-lg">Branch Visits</h3>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block tracking-widest">Select Month</label>
                    <input 
                        type="month" 
                        value={selectedMonth} 
                        onChange={e => setSelectedMonth(e.target.value)} 
                        className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100" 
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block tracking-widest">Preparer</label>
                    <select 
                        className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer" 
                        value={preparerId} 
                        onChange={e => setPreparerId(e.target.value)}
                    >
                        <option value="">Select Preparer</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.fullNameEn}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block tracking-widest">Signatory</label>
                    <select 
                        className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer" 
                        value={signatoryId} 
                        onChange={e => setSignatoryId(e.target.value)}
                    >
                        <option value="">Select Signatory</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.fullNameEn}</option>)}
                    </select>
                </div>
            </div>
            <button 
                onClick={onGenerate} 
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
                <Download size={16}/>
                Generate PDF
            </button>
        </div>
    );
};
