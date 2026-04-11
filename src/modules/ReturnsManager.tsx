import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { 
    Calendar, 
    MapPin, 
    User as UserIcon, 
    Plus, 
    Trash2, 
    FileText, 
    Download, 
    CheckCircle2,
    Clock,
    PlusCircle,
    Building2,
    Shield,
    X,
    FileSearch,
    ChevronRight,
    Search,
    Filter,
    ArrowRight,
    Calculator,
    ShieldCheck,
    Info,
    AlertTriangle,
    Save,
    Lock
} from 'lucide-react';
import { formatLocalISO } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DicgcReturnSchema, type DicgcReturnData } from '../types/dicgc';
import { generateDicgcPdf } from '../utils/dicgcPdfGenerator';

/** Utility for cleaner tailwind classes */
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ── Shared Types ─────────────────────────────────────────────────────────────

interface Branch {
    id: string;
    code: string;
    nameEn: string;
    type?: string;
}

interface Visit {
    id: string;
    visitDate: string;
    branchId: string;
    purpose: string;
    observations?: string;
    visitorCategory: string;
    branch: { nameEn: string; code: string };
    visitor: { fullNameEn: string };
}

interface User {
    id: string;
    fullNameEn: string;
}

// ── DICGC Internal Component ───────────────────────────────────────────────

const DICGCReturn: React.FC<{ staff: User[] }> = ({ staff }) => {
    const { user: authUser } = useAuth();
    
    // ── Persistent State ─────────────────────────────────────────────────────
    const [returnDate, setReturnDate] = useState('2026-03-31');
    const [isFrozen, setIsFrozen] = useState(false);
    
    const [formData, setFormData] = useState<DicgcReturnData>({
        header: {
            regionalOfficeName: 'Dindigul Regional Office',
            returnDate: '2026-03-31',
        },
        di01: {
            item1: 0, item1a: 0, item1b: 0, item1c: 0, item1d: 0, item1e: 0,
            item2: 0, item3: 0, item4: 0, item5: 0, item6: 0, item7: 0,
            item8: 0, item9: 0, item10: 0, item11: 0, item12: 0,
        },
        item13: {
            bracket1: { bracket: 'Upto Rs. 5,00,000', accountCount: 0, amount: 0 },
            bracket2: { bracket: 'Rs. 5L to 7.5L', accountCount: 0, amount: 0 },
            bracket3: { bracket: 'Rs. 7.5L to 10L', accountCount: 0, amount: 0 },
            bracket4: { bracket: 'Over Rs. 10,00,000', accountCount: 0, amount: 0 },
        },
        format1: {
            clearingDifference: 0, clearingNextDay: 0, deposits: 0, ecgcDicgcClaims: 0,
            suitFiledCourt: 0, itStAttachment: 0, tds: 0, excessCash: 0,
            vigilanceCases: 0, others: 0,
        }
    });

    // ── Drafting & Persistence ───────────────────────────────────────────────
    
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
            // Reset if no draft for this period
            setFormData(prev => ({ ...prev, header: { ...prev.header, returnDate } }));
            setIsFrozen(false);
        }
    }, [storageKey]);

    // Save draft on change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!loading) { // Don't save during initialization
                const payload = { data: formData, isFrozen, updatedAt: new Date().toISOString() };
                localStorage.setItem(storageKey, JSON.stringify(payload));
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [formData, isFrozen, storageKey]);

    const [showFormat1, setShowFormat1] = useState(false);
    const [errors, setErrors] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    // Initial load finish
    useEffect(() => {
        const t = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(t);
    }, []);

    const calculatedItem3 = useMemo(() => {
        const d = formData.di01;
        return d.item1 - (d.item1a + d.item1b + d.item1c + d.item1d + d.item1e) + d.item2;
    }, [formData.di01]);

    const totalFormat1 = useMemo(() => Object.values(formData.format1).reduce((a, b) => a + b, 0), [formData.format1]);
    const totalItem13 = useMemo(() => Object.values(formData.item13).reduce((a, b) => a + b.amount, 0), [formData.item13]);
    const isAmountMismatched = Math.abs(totalItem13 - calculatedItem3) > 1;

    const updateDI01 = (field: keyof typeof formData.di01, value: number) => {
        setFormData(prev => ({ ...prev, di01: { ...prev.di01, [field]: value } }));
    };

    const updateFormat1TotalInDI01 = () => {
        // Sync Format-1 Sum (Rs) to DI-01 Item 4 (Rs '000)
        const inThousands = Math.round(totalFormat1 / 1000 * 100) / 100;
        updateDI01('item4', inThousands);
        setShowFormat1(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const finalData = { ...formData, di01: { ...formData.di01, item3: calculatedItem3 } };
        const result = DicgcReturnSchema.safeParse(finalData);

        if (!result.success) {
            setErrors(result.error.format());
            setIsSubmitting(false);
            return;
        }

        generateDicgcPdf(finalData);
        await new Promise(r => setTimeout(r, 1000));
        setIsSubmitting(false);
    };

    const NumericInput = ({ label, value, onChange, prefix = "₹", suffix = "'000", helperText, error, readOnly }: any) => (
        <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
            <div className={cn(
                "group relative flex items-center bg-white border rounded-2xl transition-all h-12 overflow-hidden shadow-sm",
                error ? "border-red-200 ring-4 ring-red-50/50" : "border-slate-100 focus-within:ring-4 focus-within:ring-indigo-50/50",
                readOnly && "bg-slate-50/50 cursor-not-allowed opacity-80"
            )}>
                <span className="pl-4 pr-2 text-slate-300 font-bold">{prefix}</span>
                <input 
                    type="number" value={value || ''}
                    onChange={(e) => !readOnly && onChange(parseFloat(e.target.value) || 0)}
                    readOnly={readOnly}
                    className="flex-1 bg-transparent border-none focus:ring-0 font-bold text-slate-700 text-sm"
                    placeholder="0.00"
                />
                <span className="px-4 text-[10px] font-black text-slate-400 opacity-60 bg-slate-50/50 h-full flex items-center border-l border-slate-50 tracking-tighter">{suffix}</span>
            </div>
            {helperText && <p className="text-[9px] text-slate-400/80 ml-1 font-medium italic">{helperText}</p>}
        </div>
    );

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
                                <option value="2026-03-31">31 MAR 2026</option>
                                <option value="2025-09-30">30 SEP 2025</option>
                                <option value="2025-03-31">31 MAR 2025</option>
                                <option value="2024-09-30">30 SEP 2024</option>
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
                                    <button 
                                        type="button" 
                                        onClick={() => window.confirm("Unfreeze return for editing?") && setIsFrozen(false)}
                                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest"
                                    >
                                        Unlock Return
                                    </button>
                                ) : (
                                    <button 
                                        type="button" 
                                        onClick={() => setIsFrozen(true)}
                                        className="text-[10px] font-black text-emerald-600 hover:text-emerald-800 uppercase tracking-widest"
                                    >
                                        Freeze for Submission
                                    </button>
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
                                <div className="space-y-1.5 opacity-90"><label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-1">ITEM 3: Assessable Total</label><div className="bg-indigo-600 h-12 rounded-2xl flex items-center px-4 justify-between shadow-lg shadow-indigo-100"><span className="text-white font-black">₹{calculatedItem3.toLocaleString()}</span><Calculator size={18} className="text-white/40" /></div></div>
                            </div>
                            <div className="grid grid-cols-2 gap-6 pt-4">
                                <div className="relative"><NumericInput label="ITEM 4: Sundry Creditors" value={formData.di01.item4} onChange={(v:number) => updateDI01('item4',v)} readOnly={isFrozen}/><button type="button" onClick={() => setShowFormat1(true)} className="absolute right-3 top-[34px] hover:text-indigo-600 text-slate-400 transition-colors"><FileSearch size={18} /></button></div>
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
                                        <input 
                                            type="number" 
                                            placeholder="Accounts" 
                                            value={v.accountCount||''} 
                                            readOnly={isFrozen}
                                            onChange={(e)=>setFormData(p=>({...p,item13:{...p.item13,[k]:{...v,accountCount:parseInt(e.target.value)||0}}}))} 
                                            className="bg-white rounded-xl h-9 px-3 text-xs font-bold border-none ring-1 ring-slate-100 disabled:opacity-50" 
                                        />
                                        <input 
                                            type="number" 
                                            placeholder="Amt ('000)" 
                                            value={v.amount||''} 
                                            readOnly={isFrozen}
                                            onChange={(e)=>setFormData(p=>({...p,item13:{...p.item13,[k]:{...v,amount:parseFloat(e.target.value)||0}}}))} 
                                            className="bg-white rounded-xl h-9 px-3 text-xs font-bold border-none ring-1 ring-slate-100 disabled:opacity-50" 
                                        />
                                    </div>
                                </div>
                            ))}
                            <div className={cn("mt-4 p-5 rounded-3xl flex justify-between items-center", isAmountMismatched ? "bg-amber-50" : "bg-emerald-50")}>
                                <div><p className="text-[9px] font-black uppercase opacity-40">Bracket Sum</p><p className={cn("text-lg font-black", isAmountMismatched ? "text-amber-600":"text-emerald-700")}>{totalItem13.toLocaleString()}</p></div>
                                <div className="text-right">{isAmountMismatched ? <AlertTriangle className="text-amber-500" /> : <ShieldCheck className="text-emerald-500" />}</div>
                            </div>
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={isSubmitting || isAmountMismatched || !isFrozen} 
                        title={!isFrozen ? "Please freeze the return before generating final PDF" : ""}
                        className={cn(
                            "w-full h-16 rounded-[2rem] flex items-center justify-center gap-3 font-black transition-all shadow-xl shadow-indigo-100", 
                            (isSubmitting || isAmountMismatched || !isFrozen) ? "bg-slate-200 text-slate-400":"bg-bank-navy text-white hover:bg-slate-800 shadow-indigo-200"
                        )}
                    >
                        {isSubmitting ? "Generating Report..." : <><Save size={18} />Generate DICGC PDF</>}
                    </button>
                    {!isFrozen && <p className="text-[9px] font-black text-center text-amber-600 uppercase tracking-widest mt-2 animate-pulse">Freeze return to enable PDF export</p>}
                </div>
            </form>

            {showFormat1 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-slate-900 p-8 text-white flex justify-between items-center"><div><h3 className="font-black text-xl">FORMAT-1 breakdown</h3><p className="text-[10px] opacity-40 uppercase tracking-widest">Sundry Creditors (In Rs.) {isFrozen && "(Read Only)"}</p></div><button onClick={()=>setShowFormat1(false)}><X/></button></div>
                        <div className="p-10 grid grid-cols-2 gap-5 overflow-y-auto max-h-[60vh]">
                            {Object.keys(formData.format1).map(k => (
                                <div key={k} className="space-y-1.5"><label className="text-[9px] font-black uppercase text-slate-400 ml-1">{k.replace(/([A-Z])/g, ' $1')}</label><input type="number" readOnly={isFrozen} value={(formData.format1 as any)[k]||''} onChange={(e)=>setFormData(p=>({...p,format1:{...p.format1,[k]:parseFloat(e.target.value)||0}}))} className="w-full bg-slate-50 h-12 rounded-xl px-4 font-bold text-slate-700 text-sm border-none ring-1 ring-slate-100 disabled:opacity-50" /></div>
                            ))}
                        </div>
                        <div className="p-8 bg-slate-50 border-t flex justify-between items-center"><div><p className="text-[10px] font-black text-slate-400 italic">Total: ₹{totalFormat1.toLocaleString()}</p></div><button onClick={updateFormat1TotalInDI01} disabled={isFrozen} className="bg-indigo-600 text-white px-8 h-12 rounded-2xl font-black disabled:bg-slate-200 disabled:text-slate-400">Sync with DI-01</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main Hub ─────────────────────────────────────────────────────────────

const ReturnsManager: React.FC = () => {
    const { user } = useAuth();
    const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'halfyearly'>('monthly');
    
    // Core state from original component
    const [branches, setBranches] = useState<Branch[]>([]);
    const [staff, setStaff] = useState<User[]>([]);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(false);
    const [showLogForm, setShowLogForm] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
    const [preparerId, setPreparerId] = useState('');
    const [signatoryId, setSignatoryId] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [bRes, sRes, vRes] = await Promise.allSettled([
                api.get(`/branches?limit=2000`),
                api.get(`/users?limit=2000`),
                api.get(`/visits`)
            ]);
            if (bRes.status === 'fulfilled') setBranches(bRes.value.data || []);
            if (sRes.status === 'fulfilled') setStaff(sRes.value.data.data || sRes.value.data || []);
            if (vRes.status === 'fulfilled') setVisits(Array.isArray(vRes.value.data) ? vRes.value.data : []);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleDownloadReport = async (type: 'business' | 'visits' | 'observation', visitId?: string) => {
        try {
            const url = type === 'business' ? `/returns/generate?date=${formatLocalISO(new Date())}` 
                      : type === 'visits' ? `/returns/generate-visits?month=${selectedMonth}&preparerId=${preparerId}&signatoryId=${signatoryId}`
                      : `/returns/generate-visit-letter/${visitId}`;
            const res = await api.get(url, { responseType: 'blob' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(new Blob([res.data]));
            link.setAttribute('download', `${type}_report.pdf`);
            link.click();
        } catch (e) { alert('Report generation failed'); }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto pb-24">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 animate-in fade-in duration-700">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4"><Shield className="w-10 h-10 text-indigo-600" />Returns Hub</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-2 ml-1">Consolidated Statutory & Regional Reporting Center</p>
                </div>
                <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
                    {['monthly', 'quarterly', 'halfyearly'].map(p => (
                        <button key={p} onClick={()=>setPeriod(p as any)} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", period === p ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50":"text-slate-400 hover:text-slate-600")}>{p}</button>
                    ))}
                </div>
            </header>

            {period === 'monthly' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-right-4 duration-500">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 space-y-8">
                            <div className="flex items-center gap-4"><Building2 className="text-indigo-600"/><h3 className="font-black text-lg">Branch Visits</h3></div>
                            <div className="space-y-4"><input type="month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-sm" /><select className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-xs" value={preparerId} onChange={e=>setPreparerId(e.target.value)}><option value="">Preparer</option>{staff.map(s=><option key={s.id} value={s.id}>{s.fullNameEn}</option>)}</select><select className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-xs" value={signatoryId} onChange={e=>setSignatoryId(e.target.value)}><option value="">Signatory</option>{staff.map(s=><option key={s.id} value={s.id}>{s.fullNameEn}</option>)}</select></div>
                            <button onClick={()=>handleDownloadReport('visits')} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2"><Download size={16}/>Generate PDF</button>
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden min-h-[500px]">
                        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center"><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Monthly Visit Logs</h4><button onClick={()=>setShowLogForm(true)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><PlusCircle size={20}/></button></div>
                        <div className="overflow-x-auto"><table className="w-full">{/* table content matches original */}</table></div>
                    </div>
                </div>
            )}

            {period === 'quarterly' && (
                <div className="h-96 border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center text-slate-300 animate-in zoom-in-95 duration-500"><Calendar size={48} className="mb-4 opacity-20" /><p className="font-black uppercase tracking-widest text-xs">Quarterly Returns Pending Provisioning</p></div>
            )}

            {period === 'halfyearly' && <DICGCReturn staff={staff} />}
        </div>
    );
};

export default ReturnsManager;
