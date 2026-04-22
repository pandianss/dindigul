import React from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { CustomDatePicker } from '../../../../components/CustomDatePicker';
import { formatLocalISO, parseLocalISO } from '../../../../utils/dateUtils';
import { Budget, SanctionFormState } from '../../types';
import { SANCTION_TYPES } from '../../constants';

interface SanctionFormProps {
    form: SanctionFormState;
    setForm: (f: SanctionFormState | ((prev: SanctionFormState) => SanctionFormState)) => void;
    budgets: Budget[];
    onSave: (e: React.FormEvent) => void;
    onClose: () => void;
}

export const SanctionForm: React.FC<SanctionFormProps> = ({
    form,
    setForm,
    budgets,
    onSave,
    onClose
}) => {
    return (
        <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-500 border-l border-slate-100 flex flex-col">
            <div className="p-8 bg-bank-navy text-white flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-2xl font-black tracking-tight">New Expenditure Sanction</h3>
                    <p className="text-blue-200 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 opacity-60">Record a move from departmental budget</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-2xl leading-none">✕</button>
            </div>

            <form onSubmit={onSave} className="p-8 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sanction Title</label>
                        <input
                            type="text" required placeholder="Description of expense..."
                            className="w-full p-4 bg-slate-50 border-2 border-slate-50 focus:bg-white focus:border-bank-teal rounded-2xl transition-all text-sm font-bold outline-none"
                            value={form.title}
                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Amount (₹)</label>
                            <input
                                type="number" required placeholder="0.00"
                                className="w-full p-4 bg-slate-50 border-2 border-slate-50 focus:bg-white focus:border-bank-teal rounded-2xl transition-all text-sm font-black outline-none"
                                value={form.amount || ''}
                                onChange={e => setForm(p => ({ ...p, amount: parseFloat(e.target.value) }))}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sanction Type</label>
                            <select
                                className="w-full p-4 bg-slate-50 border-2 border-slate-50 focus:bg-white focus:border-bank-teal rounded-2xl transition-all text-sm font-bold outline-none"
                                value={form.type}
                                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                            >
                                {SANCTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Section / Budget Head</label>
                            <select
                                required className="w-full p-4 bg-slate-50 border-2 border-slate-50 focus:bg-white focus:border-bank-teal rounded-2xl transition-all text-sm font-bold outline-none"
                                value={form.budgetId}
                                onChange={e => {
                                    const budget = budgets.find(b => b.id === e.target.value);
                                    setForm(p => ({ ...p, budgetId: e.target.value, section: budget?.section || '' }));
                                }}
                            >
                                <option value="">Select Budget...</option>
                                {budgets.map(b => (
                                    <option key={b.id} value={b.id}>{b.section} (Avl: ₹{((b.allocationAmount - b.spentAmount) / 1000).toFixed(1)}K)</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sanction Date</label>
                            <CustomDatePicker
                                selected={parseLocalISO(form.date)}
                                onChange={(d: Date | null) => setForm(p => ({ ...p, date: formatLocalISO(d) }))}
                                className="w-full p-4 bg-slate-50 border-2 border-slate-50 focus:bg-white focus:border-bank-teal rounded-2xl transition-all text-sm font-black outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Vendor/Beneficiary</label>
                            <input
                                type="text" placeholder="Optional"
                                className="w-full p-4 bg-slate-50 border-2 border-slate-50 focus:bg-white focus:border-bank-teal rounded-2xl transition-all text-sm font-bold outline-none"
                                value={form.vendorName}
                                onChange={e => setForm(p => ({ ...p, vendorName: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Bill/Invoice No.</label>
                            <input
                                type="text" placeholder="Optional"
                                className="w-full p-4 bg-slate-50 border-2 border-slate-50 focus:bg-white focus:border-bank-teal rounded-2xl transition-all text-sm font-bold outline-none"
                                value={form.billNo}
                                onChange={e => setForm(p => ({ ...p, billNo: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-5 bg-amber-50 rounded-[1.5rem] border border-amber-100 flex items-start space-x-4">
                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                    <p className="text-[10px] text-amber-700 leading-relaxed font-black uppercase tracking-wider">
                        Submitting this sanction will immediately deduct the amount from the departmental budget and record an entry in the RO Sanction Register.
                    </p>
                </div>

                <button 
                    type="submit" 
                    className="w-full bg-bank-teal text-white py-5 rounded-[2rem] font-black shadow-2xl shadow-bank-teal/20 flex items-center justify-center space-x-3 text-lg hover:scale-[1.02] active:scale-95 transition-all outline-none"
                >
                    <Save size={24} />
                    <span className="uppercase tracking-[0.2em] text-sm">Confirm Sanction</span>
                </button>
            </form>
        </div>
    );
};
