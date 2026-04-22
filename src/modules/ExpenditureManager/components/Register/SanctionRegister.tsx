import React from 'react';
import { Search, Filter, DollarSign, Calendar, Building2, Copy } from 'lucide-react';
import { ExpenseSanction } from '../../types';
import { format } from 'date-fns';
import { parseLocalISO } from '../../../../utils/dateUtils';
import { DEPARTMENTS } from '../../constants';

interface SanctionRegisterProps {
    sanctions: ExpenseSanction[];
    loading: boolean;
    filterSection: string;
    setFilterSection: (s: string) => void;
    onDuplicate: (s: ExpenseSanction) => void;
}

export const SanctionRegister: React.FC<SanctionRegisterProps> = ({
    sanctions,
    loading,
    filterSection,
    setFilterSection,
    onDuplicate
}) => {
    return (
        <div className="flex-1 flex flex-col space-y-4 min-h-0">
            <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-xl shrink-0">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text" placeholder="Search sanction title, vendor, section..."
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-bank-teal/20 rounded-2xl text-sm transition-all outline-none font-bold text-bank-navy"
                    />
                </div>
                <div className="flex items-center space-x-3 px-4">
                    <Filter size={18} className="text-gray-400" />
                    <select
                        value={filterSection}
                        onChange={(e) => setFilterSection(e.target.value)}
                        className="text-sm border-0 bg-transparent font-black text-bank-navy focus:ring-0 cursor-pointer uppercase tracking-widest"
                    >
                        <option value="">All Departments</option>
                        {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className="space-y-4 opacity-50">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white rounded-3xl animate-pulse"></div>)}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sanctions.map(sanction => (
                            <div key={sanction.id} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm hover:shadow-xl transition-all flex items-center justify-between group">
                                <div className="flex items-center space-x-5">
                                    <div className={`p-4 rounded-2xl ${sanction.type === 'CAPITAL' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        <DollarSign size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-3 mb-1">
                                            <h4 className="font-black text-bank-navy group-hover:text-bank-teal transition-colors tracking-tight">{sanction.title}</h4>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${sanction.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-50 text-slate-700 border-slate-100'}`}>{sanction.status}</span>
                                        </div>
                                        <div className="flex items-center space-x-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <span className="flex items-center space-x-1.5"><Building2 size={12} className="text-slate-300" /> <span>{sanction.section}</span></span>
                                            <span className="flex items-center space-x-1.5"><Calendar size={12} className="text-slate-300" /> <span>{format(parseLocalISO(sanction.sanctionDate) || new Date(), 'dd MMM yyyy')}</span></span>
                                            {sanction.vendorName && <span className="text-bank-navy/40 font-black">Ref: {sanction.vendorName}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-6">
                                    <div className="text-right">
                                        <p className="text-xl font-black text-bank-navy">₹{sanction.amount.toLocaleString()}</p>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{sanction.type}</p>
                                    </div>
                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4 border-l pl-4 border-slate-100">
                                        <button 
                                            onClick={() => onDuplicate(sanction)}
                                            className="p-3 text-slate-300 hover:text-bank-teal hover:bg-bank-teal/5 rounded-2xl transition-all"
                                            title="Duplicate Sanction"
                                        >
                                            <Copy size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
