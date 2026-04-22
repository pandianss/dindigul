import React from 'react';
import { IndianRupee, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { Budget, ExpenseSanction } from '../../types';
import { FINANCIAL_YEAR } from '../../constants';

interface StatsGridProps {
    budgets: Budget[];
    sanctions: ExpenseSanction[];
}

export const StatsGrid: React.FC<StatsGridProps> = ({ budgets, sanctions }) => {
    const totalBudget = budgets.reduce((acc, b) => acc + b.allocationAmount, 0);
    const totalSpent = budgets.reduce((acc, b) => acc + b.spentAmount, 0);
    const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return (
        <div className="grid grid-cols-4 gap-4 shrink-0">
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl border-l-4 border-l-bank-teal">
                <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-bank-teal/5 text-bank-teal rounded-lg">
                        <IndianRupee size={20} />
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">FY {FINANCIAL_YEAR}</span>
                </div>
                <p className="text-2xl font-black text-bank-navy">₹{(totalSpent / 100000).toFixed(2)}L</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Total Utilization</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl border-l-4 border-l-bank-navy">
                <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-bank-navy/5 text-bank-navy rounded-lg">
                        <TrendingUp size={20} />
                    </div>
                    <span className="text-[10px] font-black text-bank-navy bg-bank-navy/5 px-2 py-0.5 rounded-full uppercase tracking-tighter">{utilization.toFixed(1)}% Used</span>
                </div>
                <p className="text-2xl font-black text-bank-navy">₹{(totalBudget / 100000).toFixed(2)}L</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Yearly Budget</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl border-l-4 border-l-amber-500">
                <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-amber-500/5 text-amber-500 rounded-lg">
                        <Clock size={20} />
                    </div>
                </div>
                <p className="text-2xl font-black text-bank-navy">{sanctions.length}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Total Sanctions</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl border-l-4 border-l-bank-gold">
                <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-bank-gold/5 text-bank-gold rounded-lg">
                        <AlertCircle size={20} />
                    </div>
                </div>
                <p className="text-2xl font-black text-bank-navy">₹{((totalBudget - totalSpent) / 100000).toFixed(2)}L</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Remaining Budget</p>
            </div>
        </div>
    );
};
