import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { formatNumber } from '../utils';

interface ExceptionsTabProps {
    intelligence: any;
}

export const ExceptionsTab: React.FC<ExceptionsTabProps> = ({ intelligence }) => {
    return (
        <div className="animate-in fade-in duration-500">
            <div className="card p-8">
                <div className="flex items-center justify-between mb-8">
                    <h4 className="text-sm font-black text-bank-navy uppercase tracking-widest">Compliance & Quality Exceptions</h4>
                    <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Auto-detected Rejections</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                <th className="pb-4 px-2">Account Details</th>
                                <th className="pb-4 px-2">Opening Bal</th>
                                <th className="pb-4 px-2">Validation Status</th>
                                <th className="pb-4 px-2">Rejection Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {intelligence?.rejectionSummary?.map((rej: any) => (
                                <tr key={rej.rejectionReason || 'unknown'} className="border-b border-gray-50 group hover:bg-gray-50/50">
                                    <td className="py-4 px-2">
                                        <p className="text-xs font-black text-bank-navy uppercase">{rej.rejectionReason || 'UNSPECIFIED'}</p>
                                    </td>
                                    <td className="py-4 px-2">
                                        <span className="text-[10px] font-bold text-gray-500">Qualification Batch</span>
                                    </td>
                                    <td className="py-4 px-2">
                                        <div className="flex items-center space-x-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                            <span className="text-[9px] font-black text-red-600 uppercase">Rejected</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-black text-bank-navy">{formatNumber(rej._count.foracid)}</span>
                                            <span className="text-[8px] font-bold text-gray-400 uppercase">Records</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {(!intelligence?.rejectionSummary || intelligence.rejectionSummary.length === 0) && (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center">
                                        <div className="flex flex-col items-center space-y-4">
                                            <CheckCircle size={32} className="text-green-300" />
                                            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest tracking-widest">No compliance exceptions detected for this period.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detailed Rejection Breakdown */}
            {intelligence?.rejectedSchemes?.length > 0 && (
                <div className="mt-6 card p-8 bg-gray-50/30">
                    <h4 className="text-[10px] font-black text-bank-navy uppercase tracking-widest mb-6 border-b border-gray-100 pb-4">Detailed Scheme Rejections (Top 10)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {intelligence.rejectedSchemes.map((rej: any) => (
                            <div key={rej.schmCode} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                <p className="text-xs font-black text-bank-navy uppercase">{rej.schmCode}</p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[14px] font-black text-red-500">{formatNumber(rej._count.foracid)}</span>
                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Accounts</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
