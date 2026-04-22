import React from 'react';
import { PieChart } from 'lucide-react';
import { Budget } from '../../types';

interface DepartmentUtilizationProps {
    budgets: Budget[];
}

export const DepartmentUtilization: React.FC<DepartmentUtilizationProps> = ({ budgets }) => {
    return (
        <div className="w-80 space-y-4 overflow-y-auto pr-1 shrink-0">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="font-black text-bank-navy uppercase tracking-widest text-xs">Section Utilization</h3>
                    <PieChart size={18} className="text-bank-gold" />
                </div>
                <div className="space-y-8">
                    {budgets.map(budget => {
                        const usedPercentage = (budget.spentAmount / budget.allocationAmount) * 100;
                        return (
                            <div key={budget.id}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[11px] font-black text-bank-navy uppercase tracking-wider">{budget.section}</span>
                                    <span className="text-[10px] font-black text-slate-400">₹{(budget.spentAmount / 100000).toFixed(1)}L / ₹{(budget.allocationAmount / 100000).toFixed(1)}L</span>
                                </div>
                                <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                    <div
                                        className={`h-full transition-all duration-1000 rounded-full ${
                                            usedPercentage > 90 ? 'bg-red-500' : usedPercentage > 70 ? 'bg-amber-500' : 'bg-bank-teal'
                                        }`}
                                        style={{ width: `${Math.min(usedPercentage, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2">
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{usedPercentage.toFixed(1)}% utilized</span>
                                    <span className="text-[9px] font-black text-bank-navy opacity-40 uppercase tracking-widest">{budget._count.sanctions} sanctions</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
