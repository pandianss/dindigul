import React from 'react';
import { Activity, RefreshCw, Lock, LayoutDashboard, ShieldAlert, Search } from 'lucide-react';
import { MisSnapshot } from '../types';

interface SnapshotHeaderProps {
    user: any;
    showManagementView: boolean;
    setShowManagementView: (show: boolean) => void;
    branchCode: string;
    setBranchCode: (code: string) => void;
    units: any[];
    date: string;
    setDate: (date: string) => void;
    handleGenerate: () => void;
    handleFreeze: () => void;
    isGenerating: boolean;
    snapshot: MisSnapshot | null;
}

export const SnapshotHeader: React.FC<SnapshotHeaderProps> = ({
    user,
    showManagementView,
    setShowManagementView,
    branchCode,
    setBranchCode,
    units,
    date,
    setDate,
    handleGenerate,
    handleFreeze,
    isGenerating,
    snapshot
}) => {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                    <Activity className="text-blue-600 w-8 h-8" />
                    Business Snapshot
                </h1>
                <p className="text-slate-500 font-medium ml-11 -mt-1 uppercase tracking-widest text-[10px]">Strategic Performance Monitoring</p>
            </div>

            <div className="flex flex-wrap gap-3">
                {['ADMIN', 'RO_USER', 'RO_MANAGER'].includes(user?.role || '') && (
                    <button
                        onClick={() => setShowManagementView(!showManagementView)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border transition-all font-bold text-sm shadow-sm ${showManagementView
                            ? 'bg-blue-50 border-blue-200 text-blue-600'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        {showManagementView ? <LayoutDashboard size={16} /> : <ShieldAlert size={16} />}
                        {showManagementView ? 'Branch View' : 'Management Oversight'}
                    </button>
                )}

                <div className="flex flex-wrap gap-3">
                    {['ADMIN', 'RO_USER', 'RO_MANAGER'].includes(user?.role || '') && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm relative group">
                            <Search className="w-4 h-4 text-slate-400" />
                            <select
                                value={branchCode}
                                onChange={(e) => setBranchCode(e.target.value)}
                                className="bg-transparent outline-none text-sm font-bold text-slate-700 cursor-pointer pr-4 appearance-none font-mono"
                            >
                                <option value="">Select Unit</option>
                                <optgroup label="Management & Oversight Units (RO/LPC)">
                                    {units.filter(u => ['RO', 'REGIONAL', 'OFFICE', 'LPC'].some(t => (u.type || '').toUpperCase().includes(t))).map(u => (
                                        <option key={u.code} value={u.code}>{u.code} - {u.nameEn}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Branches">
                                    {units.filter(u => !['RO', 'REGIONAL', 'OFFICE', 'LPC'].some(t => (u.type || '').toUpperCase().includes(t))).map(u => (
                                        <option key={u.code} value={u.code}>{u.code} - {u.nameEn}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                    )}
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-sm font-bold text-slate-700 outline-none"
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all font-bold shadow-md shadow-blue-200"
                    >
                        <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                        {isGenerating ? 'Processing...' : 'Generate New'}
                    </button>

                    {snapshot && snapshot.status !== 'FINAL' && (
                        <button
                            onClick={handleFreeze}
                            className="flex items-center gap-2 bg-bank-navy text-white px-5 py-2 rounded-xl hover:bg-slate-800 transition-all font-bold shadow-md shadow-slate-200"
                        >
                            <Lock className="w-4 h-4" />
                            Freeze Snapshot
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
