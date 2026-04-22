import React from 'react';
import { Trophy, CheckCircle2, Verified, ArrowUpRight, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { PerformanceReport } from '../../types';

interface LeaderboardProps {
    rankings: PerformanceReport | null;
    selectedDate: string;
    dailyTarget: number;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
    rankings,
    selectedDate,
    dailyTarget
}) => {
    return (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden mb-8">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-4">
                <div className="w-14 h-14 bg-bank-gold/10 rounded-2xl flex items-center justify-center text-bank-gold">
                    <Trophy size={28} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Qualification Deadline</p>
                    <h3 className="text-lg font-black text-bank-navy">
                        {rankings?.qualificationDate ? format(new Date(rankings.qualificationDate), 'dd MMM yyyy') : 'Calculating...'}
                    </h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">80% Duration Mark</p>
                </div>
            </div>
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                <div className="flex items-center space-x-4">
                    <Trophy size={20} className="text-bank-gold" />
                    <h3 className="font-black text-bank-navy text-lg uppercase tracking-tight">Regional Leaderboard</h3>
                    <div className="h-4 w-px bg-gray-200" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">Status as of {format(new Date(selectedDate), 'dd MMMM')}</span>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                        <CheckCircle2 size={16} className="text-green-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active</span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="py-4 px-8 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Rank</th>
                            <th className="py-4 px-8 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Branch Profile</th>
                            <th className="py-4 px-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Daily Progress</th>
                            <th className="py-4 px-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Aggregated (Total)</th>
                            <th className="py-4 px-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Objective</th>
                            <th className="py-4 px-8 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Factor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 overflow-hidden">
                        {rankings?.overall.map((r: any, index: number) => (
                            <tr key={r.branchId} className="group hover:bg-gray-50/50 transition-all">
                                <td className="py-5 px-8">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-[10px] font-black text-bank-navy group-hover:bg-bank-teal group-hover:text-white transition-all shadow-sm">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <p className="font-black text-bank-navy text-sm uppercase tracking-tight">{r.branchName}</p>
                                                {r.isQualified && (
                                                    <div className="flex items-center bg-bank-teal/10 text-bank-teal px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest animate-in zoom-in-50">
                                                        <Verified size={10} className="mr-1" />
                                                        Qualified
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase">BRANCH {r.branchCode}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-5 px-8 text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                        <span className="font-black text-bank-teal">{r.dailyAchievement}</span>
                                        {r.dailyAchievement > dailyTarget ? <ArrowUpRight size={14} className="text-bank-teal" /> : <TrendingDown size={14} className="text-gray-300" />}
                                    </div>
                                </td>
                                <td className="py-5 px-8 text-center">
                                    <span className="font-black text-bank-navy">{r.totalAchievement}</span>
                                </td>
                                <td className="py-5 px-8 text-center">
                                    <span className="font-black text-gray-400 opacity-50">{r.target}</span>
                                </td>
                                <td className="py-5 px-8 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className={`text-sm font-black ${r.percentage >= 100 ? 'text-bank-teal' : r.percentage >= 50 ? 'text-bank-navy' : 'text-gray-400'}`}>
                                            {r.percentage.toFixed(1)}%
                                        </span>
                                        <div className="w-24 h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${r.percentage >= 100 ? 'bg-bank-teal' : 'bg-bank-navy'}`}
                                                style={{ width: `${Math.min(r.percentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
