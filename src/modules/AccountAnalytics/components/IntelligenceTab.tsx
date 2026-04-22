import React from 'react';
import { Users, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils';

interface IntelligenceTabProps {
    intelligence: any;
}

export const IntelligenceTab: React.FC<IntelligenceTabProps> = ({ intelligence }) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Customers */}
                <div className="card p-8">
                    <h4 className="text-xs font-black text-bank-navy uppercase tracking-widest mb-6 flex items-center space-x-2">
                        <Users size={16} className="text-bank-gold" />
                        <span>High Value Acquisition Ranking</span>
                    </h4>
                    <div className="space-y-4">
                        {intelligence?.topCustomers?.map((cust: any, idx: number) => (
                            <div key={cust.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-bank-gold transition-all">
                                <div className="flex items-center space-x-4">
                                    <div className="w-8 h-8 rounded-full bg-bank-gold/10 text-bank-gold flex items-center justify-center font-black text-[10px]">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-bank-navy">{cust.acctName}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">{cust.branch.nameEn} • {cust.schmCode}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-bank-teal">{formatCurrency(cust.clrBalAmt)}</p>
                                    <div className="flex items-center justify-end space-x-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        <span className="text-[8px] font-black text-gray-500 uppercase">{cust.valueBucket}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scheme Adoption */}
                <div className="card p-8">
                    <h4 className="text-xs font-black text-bank-navy uppercase tracking-widest mb-6 flex items-center space-x-2">
                        <TrendingUp size={16} className="text-bank-teal" />
                        <span>Product Adoption Leaderboard</span>
                    </h4>
                    <div className="space-y-6">
                        {intelligence?.schemeAdoption?.map((scheme: any) => (
                            <div key={scheme.schmCode} className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs font-black text-bank-navy uppercase tracking-tight">{scheme.schmCode}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">{scheme.accountClass} SERIES</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-black text-bank-navy">{scheme._count.foracid} ACCTS</span>
                                    </div>
                                </div>
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-bank-teal transition-all duration-1000"
                                        style={{ width: `${Math.min((scheme._count.foracid / (intelligence?.topCustomers?.length * 2 || 1)) * 100, 100)}%` }}
                                    />
                                </div>
                                <p className="text-[8px] font-black text-gray-400 text-right uppercase">Avg Funding: {formatCurrency(scheme._avg.clrBalAmt)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
