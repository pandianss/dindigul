import React from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { CustomDatePicker } from '../../../components/CustomDatePicker';
import { formatLocalISO, parseLocalISO } from '../../../utils/dateUtils';
import { cn } from '../../../utils/cn';
import { AnalyticsData } from '../types';

interface IngestionStripProps {
    stats: AnalyticsData | null;
    uploadType: 'opening' | 'closure';
    setUploadType: (val: 'opening' | 'closure') => void;
    date: string;
    setDate: (val: string) => void;
    file: File | null;
    setFile: (file: File | null) => void;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleUpload: () => void;
    uploading: boolean;
    message: { type: 'success' | 'error', text: string } | null;
    lastResult?: {
        total: number;
        qualified: number;
        rejectionRate: string;
        capturedBalance: number;
        avgOpeningBalance: number;
    } | null;
}

export const IngestionStrip: React.FC<IngestionStripProps> = ({
    stats,
    uploadType,
    setUploadType,
    date,
    setDate,
    file,
    setFile,
    handleFileChange,
    handleUpload,
    uploading,
    message,
    lastResult
}) => {
    return (
        <div className="space-y-3">
            {/* Post-Upload Rich Analytics Summary (Relatable Feedback) */}
            {lastResult && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-500">
                    <div className="card bg-bank-navy text-white p-4 flex flex-col justify-between overflow-hidden relative group">
                        <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Total Processed</span>
                        <div className="flex items-end justify-between mt-2">
                            <span className="text-2xl font-black tracking-tighter">{lastResult.total}</span>
                            <span className="text-[10px] font-bold opacity-40 mb-1">Accounts</span>
                        </div>
                    </div>
                    <div className="card bg-white border-bank-teal/20 p-4 border-l-4 border-l-bank-teal hover:shadow-lg transition-all">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Quality Score</span>
                        <div className="flex items-end justify-between mt-2">
                            <span className="text-2xl font-black text-bank-teal tracking-tighter">{lastResult.qualified}</span>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-bank-navy leading-none">Qualified</span>
                                <span className="text-[8px] font-bold text-red-400 mt-1">{lastResult.rejectionRate} rejected</span>
                            </div>
                        </div>
                    </div>
                    <div className="card bg-white border-bank-gold/20 p-4 border-l-4 border-l-bank-gold">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Value Captured</span>
                        <div className="flex items-end justify-between mt-2">
                            <span className="text-2xl font-black text-bank-navy tracking-tighter">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(lastResult.capturedBalance)}
                            </span>
                        </div>
                    </div>
                    <div className="card bg-white p-4 border-l-4 border-l-gray-200">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Avg Cohort Bal</span>
                        <div className="flex items-end justify-between mt-2">
                            <span className="text-2xl font-black text-gray-400 tracking-tighter">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(lastResult.avgOpeningBalance)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Compact Working Days Context Bar */}
            <div className="flex items-center space-x-6 px-5 py-3 bg-gray-50/50 rounded-2xl border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <div className="flex items-center space-x-2 border-r border-gray-200 pr-4">
                    <Calendar size={14} className="text-bank-teal" />
                    <span className="text-bank-navy">Working Context:</span>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                        <span className="text-gray-400">Month:</span>
                        <span className="text-bank-navy bg-white px-2 py-0.5 rounded shadow-sm">{stats?.workingDays?.thisMonth} Days</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-gray-400">Previous:</span>
                        <span className="text-bank-navy/60">{stats?.workingDays?.lastMonth}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-gray-400">FY {stats?.calendar?.fyKey}:</span>
                        <span className="text-bank-navy/60">{stats?.workingDays?.fy}</span>
                    </div>
                </div>
                <div className="flex-1 text-right">
                    <span className="text-[9px] text-gray-300 italic">Financial Period Hierarchy</span>
                </div>
            </div>

            {/* Compact Data Ingestion Strip */}
            <div className="flex items-center space-x-4 bg-white border border-gray-100 rounded-2xl p-2 shadow-sm animate-in slide-in-from-top-2">
                <div className="flex items-center space-x-2 px-3 border-r border-gray-100">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Type:</span>
                    <select
                        value={uploadType}
                        onChange={(e) => setUploadType(e.target.value as 'opening' | 'closure')}
                        className="bg-transparent border-none text-[10px] font-black text-bank-navy outline-none focus:ring-0 cursor-pointer"
                    >
                        <option value="opening">Openings</option>
                        <option value="closure">Closures</option>
                    </select>
                </div>
                <div className="flex items-center space-x-2 px-3 border-r border-gray-100">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Date:</span>
                    <CustomDatePicker
                        selected={parseLocalISO(date)}
                        onChange={(d: Date | null) => setDate(formatLocalISO(d))}
                        className="bg-transparent border-none text-[10px] font-black text-bank-navy outline-none focus:ring-0 w-32"
                    />
                </div>
                <div className="flex-1 flex items-center space-x-3 px-2 min-w-0">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                        {file ? file.name : `Select ${uploadType === 'opening' ? 'Account Opening' : 'Account Closure'} CSV`}
                    </span>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload-compact"
                    />
                    {!file ? (
                        <label htmlFor="file-upload-compact" className="flex-shrink-0 px-3 py-1.5 bg-gray-50 text-[9px] font-black uppercase tracking-widest rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-all">
                            Browse
                        </label>
                    ) : (
                        <button onClick={() => setFile(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                            <AlertCircle size={16} />
                        </button>
                    )}
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="bg-bank-navy text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-bank-navy/10 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none whitespace-nowrap"
                    >
                        {uploading ? 'Processing...' : 'Process & Sync'}
                    </button>
                    {message && !lastResult && (
                        <div className={cn(
                            "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest animate-in slide-in-from-right-2",
                            message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        )}>
                            {message.text}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
