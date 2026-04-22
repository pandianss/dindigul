import React from 'react';
import { Activity, Users, TrendingUp } from 'lucide-react';

interface IntelligenceHubProps {
    intelligence: any;
}

export const IntelligenceHub: React.FC<IntelligenceHubProps> = ({ intelligence }) => {
    return (
        <div className="mt-12 space-y-6">
            <div className="flex items-center gap-4 mb-2 px-2">
                <div className="p-3 bg-bank-gold text-white rounded-2xl shadow-lg">
                    <Activity size={20} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-bank-navy uppercase tracking-tight">Intelligence Hub</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Advanced Unit Analytics & Growth Patterns</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-2">
                {/* High Value Acquisition */}
                <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 hover:shadow-2xl transition-shadow duration-500">
                    <h4 className="text-sm font-black text-bank-navy uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                        <Users className="text-bank-gold" size={18} />
                        High Value Acquisition
                    </h4>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {intelligence?.topCustomers?.length > 0 ? (
                            intelligence.topCustomers.map((cust: any, idx: number) => (
                                <div key={cust.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:border-bank-gold transition-all duration-300">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-bank-gold/10 text-bank-gold flex items-center justify-center font-black text-[10px]">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-bank-navy">{cust.acctName}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{cust.schmCode} • {cust.branch?.nameEn || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-bank-teal">₹{new Intl.NumberFormat('en-IN').format(cust.clrBalAmt)}</p>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{cust.valueBucket}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                                No high value accounts detected
                            </div>
                        )}
                    </div>
                </div>

                {/* Product Adoption */}
                <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 hover:shadow-2xl transition-shadow duration-500">
                    <h4 className="text-sm font-black text-bank-navy uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                        <TrendingUp className="text-bank-teal" size={18} />
                        Strategic Product Adoption
                    </h4>
                    <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {intelligence?.schemeAdoption?.length > 0 ? (
                            intelligence.schemeAdoption.map((scheme: any) => (
                                <div key={scheme.schmCode} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs font-black text-bank-navy uppercase tracking-tight">{scheme.schmCode}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{scheme.accountClass} SERIES</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-black text-bank-navy">{scheme._count.foracid} ACCTS</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-bank-teal transition-all duration-1000"
                                            style={{ width: `${Math.min((scheme._count.foracid / (intelligence?.topCustomers?.length * 2 || 1)) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Avg Balance: ₹{new Intl.NumberFormat('en-IN').format(scheme._avg.clrBalAmt)}</p>
                                        <div className="flex items-center gap-1">
                                            <div className="w-1 h-1 rounded-full bg-bank-teal animate-pulse" />
                                            <span className="text-[7px] font-black text-bank-teal uppercase">Qualified</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                                No strategic adoption data
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
