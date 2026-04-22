import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, Lock, Calculator, Filter, AlertTriangle, Save } from 'lucide-react';
import { DicgcReturnSchema } from '../../../../types/dicgc';
import { generateDicgcPdf } from '../../../../utils/dicgcPdfGenerator';
import { DicgcReturnData, User } from '../../types';
import { INITIAL_DICGC_DATA, PREMIUM_RATE, GST_RATE, PERIODS } from '../../constants';
import { NumericInput } from './NumericInput';
import { AssessmentSummary } from './AssessmentSummary';
import { Format1Modal } from './Format1Modal';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const DICGCReturn: React.FC<{ staff: User[] }> = ({ staff }) => {
    // Persistent State
    const [returnDate, setReturnDate] = useState('2026-03-31');
    const [isFrozen, setIsFrozen] = useState(false);
    const [formData, setFormData] = useState<DicgcReturnData>(INITIAL_DICGC_DATA as any);
    const [showFormat1, setShowFormat1] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    const storageKey = useMemo(() => `dicgc_draft_dindigul_${returnDate}`, [returnDate]);

    // Load draft on mount or period change
    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFormData(parsed.data);
                setIsFrozen(parsed.isFrozen || false);
            } catch (e) {
                console.error("Failed to load DICGC draft", e);
            }
        } else {
            setFormData(prev => ({ ...prev, header: { ...prev.header, returnDate } }));
            setIsFrozen(false);
        }
        setLoading(false);
    }, [storageKey]);

    // Save draft on change
    useEffect(() => {
        if (loading) return;
        const timer = setTimeout(() => {
            const payload = { data: formData, isFrozen, updatedAt: new Date().toISOString() };
            localStorage.setItem(storageKey, JSON.stringify(payload));
        }, 1000);
        return () => clearTimeout(timer);
    }, [formData, isFrozen, storageKey, loading]);

    const calculatedItem3 = useMemo(() => {
        const d = formData.di01;
        return d.item1 - (d.item1a + d.item1b + d.item1c + d.item1d + d.item1e) + d.item2;
    }, [formData.di01]);

    const totalFormat1 = useMemo(() => Object.values(formData.format1).reduce((a, b) => a + b, 0), [formData.format1]);
    const totalItem13 = useMemo(() => Object.values(formData.item13).reduce((a, b) => a + b.amount, 0), [formData.item13]);
    const isAmountMismatched = Math.abs(totalItem13 - calculatedItem3) > 1;

    // Assessment Calculations
    const premiumAmount = useMemo(() => Math.round(calculatedItem3 * 1000 * PREMIUM_RATE * 100) / 100, [calculatedItem3]);
    const gstAmount = useMemo(() => Math.round(premiumAmount * GST_RATE * 100) / 100, [premiumAmount]);
    const totalPayable = useMemo(() => Math.round((premiumAmount + gstAmount) * 100) / 100, [premiumAmount, gstAmount]);

    const updateDI01 = (field: keyof typeof formData.di01, value: number) => {
        setFormData(prev => ({ ...prev, di01: { ...prev.di01, [field]: value } }));
    };

    const updateFormat1TotalInDI01 = () => {
        const inThousands = Math.round(totalFormat1 / 1000 * 100) / 100;
        updateDI01('item4', inThousands);
        setShowFormat1(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const finalData: DicgcReturnData = { 
            ...formData, 
            di01: { ...formData.di01, item3: calculatedItem3 },
            assessment: {
                premiumRate: PREMIUM_RATE * 100,
                premiumAmount,
                gstRate: GST_RATE * 100,
                gstAmount,
                totalPayable
            }
        };
        const result = DicgcReturnSchema.safeParse(finalData);

        if (!result.success) {
            alert("Validation failed. Please check Item 13 brackets and mandatory fields.");
            setIsSubmitting(false);
            return;
        }

        generateDicgcPdf(finalData);
        await new Promise(r => setTimeout(r, 1000));
        setIsSubmitting(false);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none"><ShieldCheck size={120} /></div>
                <div className="flex justify-between items-center relative z-10">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">FORM DI-01 Return</h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Half-yearly Statutory Compliance</p>
                    </div>
                    <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 flex items-center gap-6">
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Region</p>
                            <p className="text-xs font-black">Dindigul RO</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="text-center relative group">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Period End</p>
                            <select 
                                value={returnDate}
                                onChange={(e) => setReturnDate(e.target.value)}
                                disabled={isFrozen}
                                className="appearance-none bg-transparent border-none p-0 text-xs font-black text-indigo-600 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                            >
                                {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                
                {isFrozen && (
                    <div className="mt-4 flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-100 animate-pulse">
                        <Lock size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Return Frozen - Data Immutable</span>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-20">
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-50 flex justify-between items-center">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Deposit Statement Breakdown</h3>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-slate-300 italic">Values in Rs. '000</span>
                                {isFrozen ? (
                                    <button type="button" onClick={() => setIsFrozen(false)} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Unlock Return</button>
                                ) : (
                                    <button type="button" onClick={() => setIsFrozen(true)} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Freeze for Submission</button>
                                )}
                            </div>
                        </div>
                        <div className="p-8 space-y-8">
                            <NumericInput label="ITEM 1: Total Deposits" value={formData.di01.item1} onChange={(v:number) => updateDI01('item1', v)} readOnly={isFrozen} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
                                <NumericInput label="1a: Foreign Gov" value={formData.di01.item1a} onChange={(v:number) => updateDI01('item1a',v)} readOnly={isFrozen} />
                                <NumericInput label="1b: Central Gov" value={formData.di01.item1b} onChange={(v:number) => updateDI01('item1b',v)} readOnly={isFrozen} />
                                <NumericInput label="1c: State Gov" value={formData.di01.item1c} onChange={(v:number) => updateDI01('item1c',v)} readOnly={isFrozen} />
                                <NumericInput label="1d: Inter-Bank" value={formData.di01.item1d} onChange={(v:number) => updateDI01('item1d',v)} readOnly={isFrozen} />
                                <div className="md:col-span-2"><NumericInput label="1e: Exempted Deposits (DICGC)" value={formData.di01.item1e} onChange={(v:number) => updateDI01('item1e',v)} readOnly={isFrozen} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <NumericInput label="ITEM 2: Other Balances" value={formData.di01.item2} onChange={(v:number) => updateDI01('item2',v)} readOnly={isFrozen} />
                                <div className="space-y-1.5 opacity-90">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-1">ITEM 3: Assessable Total</label>
                                    <div className="bg-indigo-600 h-12 rounded-2xl flex items-center px-4 justify-between shadow-lg shadow-indigo-100">
                                        <span className="text-white font-black">₹{calculatedItem3.toLocaleString('en-IN')}</span>
                                        <Calculator size={18} className="text-white/40" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6 pt-4">
                                <div className="relative">
                                    <NumericInput label="ITEM 4: Sundry Creditors" value={formData.di01.item4} onChange={(v:number) => updateDI01('item4',v)} readOnly={isFrozen}/>
                                    <button type="button" onClick={() => setShowFormat1(true)} className="absolute right-3 top-[34px] hover:text-indigo-600 text-slate-400 transition-colors">
                                        <Filter size={18} />
                                    </button>
                                </div>
                                <NumericInput label="ITEM 5: Unpaid DDs" value={formData.di01.item5} onChange={(v:number) => updateDI01('item5',v)} readOnly={isFrozen} />
                                <NumericInput label="ITEM 6: Local Authorities" value={formData.di01.item6} onChange={(v:number) => updateDI01('item6',v)} readOnly={isFrozen} />
                                <NumericInput label="ITEM 7: Statutory Bodies" value={formData.di01.item7} onChange={(v:number) => updateDI01('item7',v)} readOnly={isFrozen} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6 sticky top-24">
                    <div className={cn("bg-white rounded-[2.5rem] border p-8 shadow-xl transition-all duration-500", isAmountMismatched ? "border-amber-200 shadow-amber-100/30" : "border-slate-100")}>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2"><Filter size={14} className="text-indigo-500" />Item 13: Account Break-up</h4>
                        <div className="space-y-4">
                            {Object.entries(formData.item13).map(([k,v]) => (
                                <div key={k} className="p-4 bg-slate-50 rounded-2xl space-y-3">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">{v.bracket}</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="number" placeholder="Accounts" value={v.accountCount||''} readOnly={isFrozen} onChange={(e)=>setFormData(p=>({...p,item13:{...p.item13,[k]:{...v,accountCount:parseInt(e.target.value)||0}}}))} className="bg-white rounded-xl h-9 px-3 text-xs font-bold border-none ring-1 ring-slate-100 disabled:opacity-50" />
                                        <input type="number" placeholder="Amt ('000)" value={v.amount||''} readOnly={isFrozen} onChange={(e)=>setFormData(p=>({...p,item13:{...p.item13,[k]:{...v,amount:parseFloat(e.target.value)||0}}}))} className="bg-white rounded-xl h-9 px-3 text-xs font-bold border-none ring-1 ring-slate-100 disabled:opacity-50" />
                                    </div>
                                </div>
                            ))}
                            <div className={cn("mt-4 p-5 rounded-3xl flex justify-between items-center", isAmountMismatched ? "bg-amber-50" : "bg-emerald-50")}>
                                <div><p className="text-[9px] font-black uppercase opacity-40">Bracket Sum</p><p className={cn("text-lg font-black", isAmountMismatched ? "text-amber-600":"text-emerald-700")}>{totalItem13.toLocaleString('en-IN')}</p></div>
                                <div className="text-right">{isAmountMismatched ? <AlertTriangle className="text-amber-500" /> : <ShieldCheck className="text-emerald-500" />}</div>
                            </div>
                        </div>
                    </div>

                    <AssessmentSummary 
                        premiumAmount={premiumAmount}
                        gstAmount={gstAmount}
                        totalPayable={totalPayable}
                    />

                    <button 
                        type="submit" 
                        disabled={isSubmitting || isAmountMismatched || !isFrozen} 
                        className={cn(
                            "w-full h-16 rounded-[2rem] flex items-center justify-center gap-3 font-black transition-all shadow-xl shadow-indigo-100", 
                            (isSubmitting || isAmountMismatched || !isFrozen) ? "bg-slate-200 text-slate-400":"bg-bank-navy text-white hover:bg-slate-800"
                        )}
                    >
                        {isSubmitting ? "Generating Report..." : <><Save size={18} />Generate DICGC PDF</>}
                    </button>
                    {!isFrozen && <p className="text-[9px] font-black text-center text-amber-600 uppercase tracking-widest mt-2 animate-pulse">Freeze return to enable PDF export</p>}
                </div>
            </form>

            {showFormat1 && (
                <Format1Modal 
                    data={formData}
                    setData={setFormData}
                    onClose={() => setShowFormat1(false)}
                    onSync={updateFormat1TotalInDI01}
                    isFrozen={isFrozen}
                />
            )}
        </div>
    );
};
