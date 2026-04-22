import React from 'react';
import { Search, Users } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { AnalyticsData, BranchStats } from '../types';
import { formatNumber, formatCurrency } from '../utils';

interface BranchPerformanceTableProps {
    stats: AnalyticsData | null;
    branchPeriod: 'month' | 'fy';
    setBranchPeriod: (p: 'month' | 'fy') => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    filteredBranches: BranchStats[];
}

export const BranchPerformanceTable: React.FC<BranchPerformanceTableProps> = ({
    stats,
    branchPeriod,
    setBranchPeriod,
    searchQuery,
    setSearchQuery,
    filteredBranches
}) => {
    return (
        <div className="card p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h4 className="text-sm font-black text-bank-navy uppercase tracking-widest">Branch-wise Performance</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest">
                        Based on {branchPeriod === 'month' ? 'current month' : 'financial year'} openings
                    </p>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                        <button
                            onClick={() => setBranchPeriod('month')}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                branchPeriod === 'month' ? "bg-white text-bank-navy shadow-sm border border-gray-100" : "text-gray-400 hover:text-bank-navy"
                            )}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBranchPeriod('fy')}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                branchPeriod === 'fy' ? "bg-white text-bank-navy shadow-sm border border-gray-100" : "text-gray-400 hover:text-bank-navy"
                            )}
                        >
                            FY {stats?.calendar?.fyKey}
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search SOL ID / Name"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-bank-navy w-64"
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-2">
                    <thead>
                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <th className="text-left px-4 py-2">Branch Details</th>
                            <th className="text-center px-4 py-2">SB Metrics (Gross/Cls | Qual/Net)</th>
                            <th className="text-center px-4 py-2">CD Metrics (Gross/Cls | Qual/Net)</th>
                            <th className="text-center px-4 py-2">Total Qual/Net</th>
                            <th className="text-center px-4 py-2">Net Rate</th>
                            <th className="text-center px-4 py-2">Avg. Bal</th>
                            <th className="text-right px-4 py-2">Efficiency</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBranches.length > 0 ? filteredBranches.map((branch) => (
                            <tr key={branch.code} className="group hover:bg-gray-50/50 transition-all animate-in fade-in duration-500">
                                <td className="px-4 py-4 bg-white border-y border-l rounded-l-2xl border-gray-100 group-hover:border-bank-navy/10">
                                    <div className="flex items-center space-x-3 text-left">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 text-bank-navy flex items-center justify-center font-black text-[10px]">
                                            {branch.code}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-bank-navy tracking-tight">{branch.name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">SOL ID: {branch.code}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 bg-white border-y border-gray-100 group-hover:border-bank-navy/10 text-center">
                                    <div className="flex flex-col items-center">
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 min-w-[120px]">
                                            <div className="flex flex-col h-full justify-between">
                                                <span className="text-[11px] font-black text-bank-navy leading-none">{formatNumber(branch.sbTotal)}</span>
                                                <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">Gross</span>
                                            </div>
                                            <div className="flex flex-col h-full justify-between">
                                                <span className="text-[11px] font-black text-red-500 leading-none">{formatNumber(branch.sbClosed)}</span>
                                                <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">Closed</span>
                                            </div>
                                            <div className="flex flex-col h-full justify-between">
                                                <span className="text-[11px] font-black text-bank-teal leading-none">{formatNumber(branch.sbQualified)}</span>
                                                <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">Qualified</span>
                                            </div>
                                            <div className="flex flex-col h-full justify-between border-l border-gray-100 pl-3">
                                                <span className="text-[11px] font-black text-bank-navy leading-none">{formatNumber(branch.sbQualified - branch.sbClosed)}</span>
                                                <span className="text-[7px] font-black text-bank-teal uppercase tracking-tighter">Net</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 bg-white border-y border-gray-100 group-hover:border-bank-navy/10 text-center">
                                    <div className="flex flex-col items-center">
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 min-w-[120px]">
                                            <div className="flex flex-col h-full justify-between">
                                                <span className="text-[11px] font-black text-bank-navy leading-none">{formatNumber(branch.cdTotal)}</span>
                                                <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">Gross</span>
                                            </div>
                                            <div className="flex flex-col h-full justify-between">
                                                <span className="text-[11px] font-black text-red-500 leading-none">{formatNumber(branch.cdClosed)}</span>
                                                <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">Closed</span>
                                            </div>
                                            <div className="flex flex-col h-full justify-between">
                                                <span className="text-[11px] font-black text-bank-gold leading-none">{formatNumber(branch.cdQualified)}</span>
                                                <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">Qualified</span>
                                            </div>
                                            <div className="flex flex-col h-full justify-between border-l border-gray-100 pl-3">
                                                <span className="text-[11px] font-black text-bank-navy leading-none">{formatNumber(branch.cdQualified - branch.cdClosed)}</span>
                                                <span className="text-[7px] font-black text-bank-gold uppercase tracking-tighter">Net</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 bg-white border-y border-gray-100 group-hover:border-bank-navy/10 text-center">
                                    <div className="flex flex-col items-center font-black">
                                        <span className="text-sm text-bank-navy">{formatNumber(branch.qualified)} / {formatNumber(branch.net)}</span>
                                        <span className="text-[8px] text-gray-400 uppercase">Qual / Net</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 bg-white border-y border-gray-100 group-hover:border-bank-navy/10 text-center">
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center space-x-1">
                                            <span className="text-[10px] font-black text-bank-navy">{branch.sbRate.toFixed(1)}</span>
                                            <span className="text-[7px] font-bold text-bank-teal uppercase">SB/Day</span>
                                        </div>
                                        <span className="text-[6px] text-gray-400 uppercase font-bold">({branchPeriod === 'month' ? 'Current Month' : 'FY to Date'})</span>
                                    </div>
                                    <div className="flex flex-col items-center border-t border-gray-50 pt-1">
                                        <div className="flex items-center space-x-1">
                                            <span className="text-[10px] font-black text-bank-navy">{branch.cdRate.toFixed(1)}</span>
                                            <span className="text-[7px] font-bold text-bank-gold uppercase">CD/Mo</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 bg-white border-y border-gray-100 group-hover:border-bank-navy/10 text-center">
                                    <span className="text-sm font-black text-bank-navy">{formatCurrency(branch.avgBalance)}</span>
                                </td>
                                <td className="px-4 py-4 bg-white border-y border-r rounded-r-2xl border-gray-100 group-hover:border-bank-navy/10 text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full transition-all duration-1000", branch.total > 0 ? "bg-bank-teal" : "bg-gray-200")}
                                                style={{ width: `${Math.min((branch.qualified / (branch.total || 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-black text-bank-navy">
                                            {branch.total > 0 ? `${((branch.qualified / branch.total) * 100).toFixed(0)}%` : '0%'}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="py-20 text-center">
                                    <div className="flex flex-col items-center space-y-4">
                                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200">
                                            <Users size={32} />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No branch records found for this period</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
