import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    AlertTriangle,
    ChevronRight,
    Search,
    Filter,
    Calendar,
    ArrowUpDown,
    CheckCircle2,
    XCircle,
    Info,
    ArrowRight,
    Lock
} from 'lucide-react';

interface ExceptionSummaryRow {
    branchCode: string;
    branchName: string;
    snapshotStatus: 'PROVISIONAL' | 'FINAL' | 'MISSING';
    exceptionCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    exceptions: any[];
}

interface ExceptionSummaryProps {
    selectedDate: string;
    onSelectBranch: (code: string) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ExceptionSummary: React.FC<ExceptionSummaryProps> = ({ selectedDate, onSelectBranch }) => {
    const [summary, setSummary] = useState<ExceptionSummaryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'MISSING'>('ALL');
    const [isFinalizing, setIsFinalizing] = useState(false);

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.get(`${API_URL}/mis/exception-summary?date=${selectedDate}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSummary(res.data);
        } catch (err) {
            console.error('Failed to fetch exception summary:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedDate) fetchSummary();
    }, [selectedDate]);

    const handleFinalizeAll = async () => {
        if (!window.confirm(`Are you sure you want to finalize ALL snapshots for ${selectedDate}? This will freeze the data and trigger rule evaluations bank-wide.`)) return;

        setIsFinalizing(true);
        try {
            const token = sessionStorage.getItem('token');
            await axios.post(`${API_URL}/mis/finalize-all`, { date: selectedDate }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchSummary();
        } catch (err) {
            console.error('Failed to finalize all:', err);
        } finally {
            setIsFinalizing(false);
        }
    };

    const filteredData = summary.filter(row => {
        const matchesSearch = row.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.branchCode.includes(searchTerm);

        if (statusFilter === 'CRITICAL') return matchesSearch && row.criticalCount > 0;
        if (statusFilter === 'HIGH') return matchesSearch && row.highCount > 0;
        if (statusFilter === 'MEDIUM') return matchesSearch && row.mediumCount > 0;
        if (statusFilter === 'MISSING') return matchesSearch && row.snapshotStatus === 'MISSING';
        return matchesSearch;
    });

    const stats = {
        total: summary.length,
        missing: summary.filter(s => s.snapshotStatus === 'MISSING').length,
        critical: summary.filter(s => s.criticalCount > 0).length,
        high: summary.filter(s => s.highCount > 0).length,
        medium: summary.filter(s => s.mediumCount > 0).length,
        provisional: summary.filter(s => s.snapshotStatus === 'PROVISIONAL').length
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 animate-pulse">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Aggregating Risk Matrix...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm shadow-slate-100/50">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Total Branches</p>
                    <p className="text-2xl font-black text-slate-800">{stats.total}</p>
                </div>
                <div className={`p-4 rounded-2xl border shadow-sm ${stats.critical > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
                    <p className="text-[10px] uppercase font-black tracking-widest text-red-400 mb-1">Critical Risks</p>
                    <p className="text-2xl font-black text-red-600">{stats.critical}</p>
                </div>
                <div className={`p-4 rounded-2xl border shadow-sm ${stats.high > 0 ? 'bg-orange-50 border-orange-100' : 'bg-white border-slate-100'}`}>
                    <p className="text-[10px] uppercase font-black tracking-widest text-orange-400 mb-1">High Risks</p>
                    <p className="text-2xl font-black text-orange-600">{stats.high}</p>
                </div>
                <div className={`p-4 rounded-2xl border shadow-sm ${stats.medium > 0 ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-100'}`}>
                    <p className="text-[10px] uppercase font-black tracking-widest text-blue-400 mb-1">Medium Risks</p>
                    <p className="text-2xl font-black text-blue-600">{stats.medium}</p>
                </div>
                <div className={`p-4 rounded-2xl border shadow-sm ${stats.missing > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}`}>
                    <p className="text-[10px] uppercase font-black tracking-widest text-amber-400 mb-1">Data Missing</p>
                    <p className="text-2xl font-black text-amber-600">{stats.missing}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Provisional</p>
                    <p className="text-2xl font-black text-slate-600">{stats.provisional}</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3 flex-1 w-full">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search branch name or code..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-1 p-1 bg-slate-50 rounded-2xl">
                        {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'MISSING'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${statusFilter === f
                                    ? 'bg-white text-blue-600 shadow-sm shadow-blue-100'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {stats.provisional > 0 && (
                    <button
                        onClick={handleFinalizeAll}
                        disabled={isFinalizing}
                        className="flex items-center gap-2 bg-bank-navy text-white px-6 py-3 rounded-2xl hover:bg-slate-800 disabled:opacity-50 transition-all font-bold shadow-lg shadow-slate-200"
                    >
                        <Lock className={`w-4 h-4 ${isFinalizing ? 'animate-spin' : ''}`} />
                        {isFinalizing ? 'Processing Batch...' : `Finalize ${stats.provisional} Snapshots`}
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Branch Details</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Critical</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">High</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Medium</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Total Issues</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredData.map(row => (
                            <tr key={row.branchCode} className="hover:bg-slate-50/30 transition-colors group">
                                <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-700">{row.branchName}</span>
                                        <span className="text-[10px] font-medium text-slate-400 tracking-wider">SOL: {row.branchCode}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${row.snapshotStatus === 'FINAL' ? 'bg-emerald-50 text-emerald-600' :
                                        row.snapshotStatus === 'PROVISIONAL' ? 'bg-blue-50 text-blue-600' :
                                            'bg-slate-100 text-slate-400'
                                        }`}>
                                        {row.snapshotStatus}
                                    </span>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    {row.criticalCount > 0 ? (
                                        <span className="bg-red-50 text-red-600 w-8 h-8 rounded-full inline-flex items-center justify-center font-black text-xs border border-red-100 shadow-sm">
                                            {row.criticalCount}
                                        </span>
                                    ) : <span className="text-slate-200">0</span>}
                                </td>
                                <td className="px-6 py-5 text-center">
                                    {row.highCount > 0 ? (
                                        <span className="bg-orange-50 text-orange-600 w-8 h-8 rounded-full inline-flex items-center justify-center font-black text-xs border border-orange-100 shadow-sm">
                                            {row.highCount}
                                        </span>
                                    ) : <span className="text-slate-200">0</span>}
                                </td>
                                <td className="px-6 py-5 text-center">
                                    {row.mediumCount > 0 ? (
                                        <span className="bg-blue-50 text-blue-600 w-8 h-8 rounded-full inline-flex items-center justify-center font-black text-xs border border-blue-100 shadow-sm">
                                            {row.mediumCount}
                                        </span>
                                    ) : <span className="text-slate-200">0</span>}
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <span className={`font-bold text-sm ${row.exceptionCount > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                                        {row.exceptionCount}
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <button
                                        onClick={() => onSelectBranch(row.branchCode)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredData.length === 0 && (
                    <div className="p-20 text-center flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-2">
                            <Search className="w-8 h-8" />
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No matching branches found</p>
                    </div>
                )}
            </div>

            {/* Footer / Instruction */}
            <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-amber-600">
                    <Info className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="font-bold text-amber-900 text-sm mb-1 uppercase tracking-wider">Official Communication Workflow</h4>
                    <p className="text-amber-800/70 text-xs leading-relaxed max-w-3xl">
                        The list above represents the consolidated Exception Matrix for all units. Branches with **Critical** or **High** risks should be prioritized for official intervention. You can click on any branch to view their detailed performance snapshot and specific exception messages for your communication.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ExceptionSummary;
