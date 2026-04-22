import React from 'react';
import { Calendar, Upload, RefreshCw } from 'lucide-react';

interface DailyPulseProps {
    selectedDate: string;
    setSelectedDate: (date: string) => void;
    uploading: boolean;
    handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    totalAchievement: number;
    totalPercentage: number;
}

export const DailyPulse: React.FC<DailyPulseProps> = ({
    selectedDate,
    setSelectedDate,
    uploading,
    handleFileUpload,
    fileInputRef,
    totalAchievement,
    totalPercentage
}) => {
    return (
        <div className="bg-bank-navy p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-between">
            <div>
                <h3 className="font-black text-xl uppercase tracking-tight mb-1">Daily Pulse</h3>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-6 font-bold">Update Branch Data</p>
                
                <div className="space-y-6">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <label className="text-[10px] font-black text-white/40 uppercase block mb-2 font-bold tracking-widest">Selected Date</label>
                        <div className="flex items-center space-x-3">
                            <Calendar size={18} className="text-bank-teal" />
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent text-sm font-black text-white outline-none w-full cursor-pointer"
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full bg-bank-teal py-4 rounded-2xl font-black text-bank-navy flex items-center justify-center space-x-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-bank-teal/20 disabled:opacity-50"
                    >
                        {uploading ? <RefreshCw size={20} className="animate-spin" /> : <Upload size={20} />}
                        <span className="uppercase text-xs tracking-widest">{uploading ? 'Processing Intelligence...' : 'Upload Daily CSV'}</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />

                    <div className="text-center">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest leading-relaxed">
                            Required CSV Format:<br/>
                            <span className="text-white/60">BranchCode, Value (NPA/Accounts)</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-white/10 mt-6">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 font-bold">
                    <span>Daily Velocity</span>
                    <span className="text-bank-teal">{totalAchievement.toLocaleString()} Total</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-bank-teal shadow-[0_0_8px_rgba(45,212,191,0.5)] transition-all duration-1000" style={{ width: `${Math.min(totalPercentage, 100)}%` }} />
                </div>
            </div>
        </div>
    );
};
