import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Activity,
    TrendingUp,
    AlertCircle,
    RefreshCw,
    Lock,
    CheckCircle2,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Layers,
    X,
    PanelRightOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface SnapshotPanelData {
    id: string;
    parameter: string;
    val_prev_fy_start: number;
    val_prev_fy_end: number;
    val_fy_start: number;
    val_prev_m_end: number;
    val_dby: number;
    val_y_eod: number;
    val_current: number;
    growth_prev_fy: number;
    growth_day: number;
    growth_month: number;
    growth_fy: number;
    budget_month: number;
    gap_month: number;
    budget_quarter: number;
    gap_quarter: number;
    status: string;
    metadata: {
        displayName: string;
        category: string | null;
        fullForm?: string | null;
    };
}

interface MisException {
    id: string;
    type: string;
    severity: string;
    parameter: string;
    message: string;
    status: string;
}

interface MisSnapshot {
    id: string;
    unitId: string;
    branch?: { nameEn: string; code: string };
    businessDate: string;
    status: string;
    panelData: SnapshotPanelData[];
    exceptions: MisException[];
}

const BusinessSnapshot: React.FC = () => {
    const { user } = useAuth();
    const token = localStorage.getItem('token') || (user as any)?.token;
    const [branchCode, setBranchCode] = useState((user as any)?.branch?.code || '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [snapshot, setSnapshot] = useState<MisSnapshot | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [units, setUnits] = useState<any[]>([]);
    const [showExceptions, setShowExceptions] = useState(false);

    useEffect(() => {
        const fetchUnits = async () => {
            try {
                const res = await axios.get(`${API_BASE}/branches`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // Sort: ROs first, then branches alphabetically
                const sorted = res.data.sort((a: any, b: any) => {
                    const typeA = (a.type || '').toUpperCase();
                    const typeB = (b.type || '').toUpperCase();
                    const isROA = typeA.includes('REGIONAL') || typeA.includes('OFFICE');
                    const isROB = typeB.includes('REGIONAL') || typeB.includes('OFFICE');
                    if (isROA && !isROB) return -1;
                    if (!isROA && isROB) return 1;
                    return a.nameEn.localeCompare(b.nameEn);
                });
                setUnits(sorted);

                // If admin, default to the first RO if present
                if (user?.role === 'ADMIN' && !branchCode) {
                    const firstRO = sorted.find((u: any) => u.type?.toUpperCase().includes('RO'));
                    if (firstRO) setBranchCode(firstRO.code);
                }
            } catch (err) {
                console.error('Failed to fetch units:', err);
            }
        };
        fetchUnits();
    }, [token, user?.role]);

    const fetchSnapshot = async () => {
        if (!branchCode) return;
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE}/mis/business-snapshot/${branchCode}?date=${date}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSnapshot(response.data);
        } catch (err: any) {
            setSnapshot(null);
            // Show custom error if available, otherwise generic
            setError(err.response?.data?.error || 'Failed to fetch snapshot data.');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            await axios.post(`${API_BASE}/mis/generate-from-staging`, { date }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchSnapshot();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Generation failed. Check if staging data exists for this date.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFreeze = async () => {
        if (!snapshot) return;
        try {
            await axios.post(`${API_BASE}/mis/freeze/${snapshot.id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchSnapshot();
        } catch (err) {
            setError('Failed to freeze snapshot.');
        }
    };

    useEffect(() => {
        fetchSnapshot();
    }, [branchCode, date]);

    const formatValue = (val: number) => {
        return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Surpassed': return 'bg-emerald-500 text-white';
            case 'Positive': return 'bg-blue-500 text-white';
            case 'Negative': return 'bg-rose-500 text-white';
            default: return 'bg-slate-400 text-white';
        }
    };

    const isRateMetric = (metric: string) => {
        const lower = metric.toLowerCase();
        return lower.includes('%') || lower.includes('ratio') || lower.includes('yield') || lower.includes('cost');
    };

    const GrowthIndicator = ({ val, showRaw = false }: { val: number, showRaw?: boolean }) => {
        if (Math.abs(val) < 0.01) return <span className="text-gray-400">0.00</span>;
        return (
            <div className={`flex items-center gap-1 ${val >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {val >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                <span className="font-bold">{formatValue(Math.abs(val))}</span>
            </div>
        );
    };

    const getHeaderDates = () => {
        if (!snapshot?.businessDate) return null;
        const d = new Date(snapshot.businessDate);
        const utcDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

        const yesterday = new Date(utcDate); yesterday.setUTCDate(utcDate.getUTCDate() - 1);
        const prevMonthEnd = new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), 0));

        // FY Logic
        let fyYear = utcDate.getUTCMonth() < 3 ? utcDate.getUTCFullYear() - 1 : utcDate.getUTCFullYear();
        const fyStart = new Date(Date.UTC(fyYear, 2, 31));
        const prevFyStart = new Date(Date.UTC(fyYear - 1, 2, 31));
        const prevFyEnd = new Date(Date.UTC(fyYear, 2, 31));

        const fmt = (date: Date) => {
            const day = date.getUTCDate().toString().padStart(2, '0');
            const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
            const year = date.getUTCFullYear().toString().slice(-2);
            return `${day}.${month}.${year}`;
        };

        return {
            yesterday: fmt(yesterday),
            monthEnd: fmt(prevMonthEnd),
            fyStart: fmt(fyStart),
            prevFyStart: fmt(prevFyStart),
            prevFyEnd: fmt(prevFyEnd),
            current: fmt(utcDate)
        };
    };

    const headerDates = getHeaderDates();

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <Activity className="text-blue-600 w-8 h-8" />
                        Business Snapshot
                    </h1>
                    <p className="text-slate-500 font-medium ml-11 -mt-1 uppercase tracking-widest text-[10px]">Strategic Performance Monitoring</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {user?.role === 'ADMIN' && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm relative group">
                            <Search className="w-4 h-4 text-slate-400" />
                            <select
                                value={branchCode}
                                onChange={(e) => setBranchCode(e.target.value)}
                                className="bg-transparent outline-none text-sm font-bold text-slate-700 cursor-pointer pr-4 appearance-none font-mono"
                            >
                                <option value="">Select Unit</option>
                                <optgroup label="Regional Offices">
                                    {units.filter(u => (u.type || '').toUpperCase().includes('REGIONAL') || (u.type || '').toUpperCase().includes('OFFICE')).map(u => (
                                        <option key={u.code} value={u.code}>{u.code} - {u.nameEn}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Branches">
                                    {units.filter(u => !(u.type || '').toUpperCase().includes('REGIONAL') && !(u.type || '').toUpperCase().includes('OFFICE')).map(u => (
                                        <option key={u.code} value={u.code}>{u.code} - {u.nameEn}</option>
                                    ))}
                                </optgroup>
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-blue-500 transition-colors">
                                <ArrowDownRight size={14} />
                            </div>
                        </div>
                    )}
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-sm font-bold text-slate-700 outline-none"
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all font-bold shadow-md shadow-blue-200"
                    >
                        <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                        {isGenerating ? 'Processing...' : 'Generate New'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 mb-8 animate-in slide-in-from-top duration-300">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {!loading && !snapshot && !error && (
                <div className="bg-white rounded-2xl shadow-sm p-16 text-center border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Activity className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-400 mb-2">No Snapshot Data Found</h3>
                    <p className="text-slate-400 max-w-sm mx-auto">Please select a date with uploaded staging data and click 'Generate New' to create a snapshot for this unit.</p>
                </div>
            )}

            {snapshot && (
                <div className="relative">
                    {/* Metrics Grid */}
                    <div className="space-y-8 pb-20">
                        {(() => {
                            const categories = Array.from(new Set(snapshot.panelData.map(p => p.metadata.category || 'Uncategorized'))).sort();

                            return categories.map(cat => {
                                const items = snapshot.panelData.filter(p => (p.metadata.category || 'Uncategorized') === cat);
                                if (items.length === 0) return null;

                                return (
                                    <div key={cat} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                                        <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center group">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-bank-navy text-white rounded-2xl shadow-lg shadow-bank-navy/10 group-hover:scale-110 transition-transform duration-300">
                                                    <Layers size={16} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-bank-navy uppercase tracking-widest">{cat}</h3>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{items.length} KPIs Tracked</p>
                                                </div>
                                            </div>
                                            {cat === categories[0] && (
                                                <div className={`px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-2 ${snapshot.status === 'FINAL' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                                    }`}>
                                                    <div className={`w-2 h-2 rounded-full ${snapshot.status === 'FINAL' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                                                    {snapshot.status}
                                                </div>
                                            )}
                                        </div>
                                        <div className="overflow-x-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-slate-200">
                                            <table className="w-full text-[11px] border-collapse whitespace-nowrap">
                                                <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-widest sticky top-0 z-20 shadow-sm">
                                                    <tr>
                                                        <th rowSpan={2} className="px-6 py-4 text-left border-r border-slate-100">Metric Parameter</th>
                                                        <th colSpan={3} className="px-6 py-2 text-center border-r border-slate-100 bg-slate-100/30 text-slate-600">Previous FY Performance</th>
                                                        <th colSpan={3} className="px-6 py-2 text-center border-r border-slate-100 bg-blue-50/30 text-blue-600">Recent Trend</th>
                                                        <th colSpan={3} className="px-6 py-2 text-center border-r border-slate-100 bg-emerald-50/30 text-emerald-600">Growth Analysis</th>
                                                        <th colSpan={3} className="px-6 py-2 text-center border-r border-slate-100 bg-indigo-50/30 text-indigo-600">Monthly Budget Analysis</th>
                                                        <th colSpan={2} className="px-6 py-2 text-center bg-amber-50/30 text-amber-600">Quarterly Budget</th>
                                                    </tr>
                                                    <tr className="border-b border-slate-100">
                                                        <th className="px-4 py-3 text-right">{headerDates?.prevFyStart}</th>
                                                        <th className="px-4 py-3 text-right">{headerDates?.prevFyEnd}</th>
                                                        <th className="px-4 py-3 text-right border-r border-slate-100">Growth</th>

                                                        <th className="px-4 py-3 text-right">{headerDates?.monthEnd}</th>
                                                        <th className="px-4 py-3 text-right">{headerDates?.yesterday}</th>
                                                        <th className="px-4 py-3 text-right border-r border-slate-100 font-black text-slate-900">{headerDates?.current}</th>

                                                        <th className="px-4 py-3 text-right">Daily Var</th>
                                                        <th className="px-4 py-3 text-right">MTD Growth</th>
                                                        <th className="px-4 py-3 text-right border-r border-slate-100">YTD Growth</th>

                                                        <th className="px-4 py-3 text-right">Target</th>
                                                        <th className="px-4 py-3 text-right text-indigo-700">Gap</th>
                                                        <th className="px-4 py-3 text-center border-r border-slate-100">Status</th>

                                                        <th className="px-4 py-3 text-right">Target</th>
                                                        <th className="px-4 py-3 text-right text-amber-700">Gap</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 font-medium">
                                                    {items.map((row) => {
                                                        const isRate = isRateMetric(row.parameter);
                                                        return (
                                                            <tr key={row.id} className="hover:bg-blue-50/40 transition-colors group">
                                                                <td className="px-6 py-4 border-r border-slate-100 sticky left-0 bg-white z-10 group-hover:bg-blue-50/50">
                                                                    <div className="flex flex-col">
                                                                        <div className="font-bold text-bank-navy group-hover:text-blue-700 text-[12px]">
                                                                            {row.metadata.displayName}
                                                                        </div>
                                                                        <span className="text-[8px] font-black text-slate-300 uppercase">{row.parameter}</span>
                                                                    </div>
                                                                </td>

                                                                {/* Prev FY */}
                                                                <td className="px-4 py-4 text-right text-slate-500">{formatValue(row.val_prev_fy_start)}</td>
                                                                <td className="px-4 py-4 text-right text-slate-500">{formatValue(row.val_prev_fy_end)}</td>
                                                                <td className="px-4 py-4 text-right border-r border-slate-100">
                                                                    {!isRate ? <GrowthIndicator val={row.growth_prev_fy} /> : <span className="text-slate-300">-</span>}
                                                                </td>

                                                                {/* Trend */}
                                                                <td className="px-4 py-4 text-right text-slate-600">{formatValue(row.val_prev_m_end)}</td>
                                                                <td className="px-4 py-4 text-right text-slate-600">{formatValue(row.val_y_eod)}</td>
                                                                <td className="px-4 py-4 text-right border-r border-slate-50 font-black text-slate-900 text-[13px] bg-blue-50/10">
                                                                    {formatValue(row.val_current)}
                                                                </td>

                                                                {/* Growth */}
                                                                <td className="px-4 py-4 text-right">
                                                                    {!isRate ? <GrowthIndicator val={row.growth_day} /> : <span className="text-slate-300">-</span>}
                                                                </td>
                                                                <td className="px-4 py-4 text-right">
                                                                    {!isRate ? <GrowthIndicator val={row.growth_month} /> : <span className="text-slate-300">-</span>}
                                                                </td>
                                                                <td className="px-4 py-4 text-right border-r border-slate-100">
                                                                    {!isRate ? <GrowthIndicator val={row.growth_fy} /> : <span className="text-slate-300">-</span>}
                                                                </td>

                                                                {/* Monthly Budget */}
                                                                <td className="px-4 py-4 text-right font-bold text-slate-600">
                                                                    {!isRate ? formatValue(row.budget_month) : <span className="text-slate-300 text-[9px]">N/A</span>}
                                                                </td>
                                                                <td className={`px-4 py-4 text-right font-black ${row.gap_month >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                    {!isRate ? formatValue(row.gap_month) : <span className="text-slate-300 text-[9px]">-</span>}
                                                                </td>
                                                                <td className="px-4 py-4 border-r border-slate-100 text-center">
                                                                    {!isRate ? (
                                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-tighter ${getStatusStyle(row.status)}`}>
                                                                            {row.status}
                                                                        </span>
                                                                    ) : <span className="text-slate-300 text-[9px]">-</span>}
                                                                </td>

                                                                {/* Quarterly Budget */}
                                                                <td className="px-4 py-4 text-right font-bold text-slate-600">
                                                                    {!isRate ? formatValue(row.budget_quarter) : <span className="text-slate-300 text-[9px]">N/A</span>}
                                                                </td>
                                                                <td className={`px-4 py-4 text-right font-black ${row.gap_quarter >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                    {!isRate ? formatValue(row.gap_quarter) : <span className="text-slate-300 text-[9px]">-</span>}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>

                    {/* Floating Exception FAB */}
                    <button
                        onClick={() => setShowExceptions(true)}
                        className="fixed bottom-8 right-8 bg-bank-navy text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 flex items-center gap-2 group"
                    >
                        <PanelRightOpen className="w-6 h-6" />
                        {snapshot.exceptions.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce group-hover:animate-none">
                                {snapshot.exceptions.length}
                            </span>
                        )}
                    </button>

                    {/* Exceptions Slide-over */}
                    {showExceptions && (
                        <>
                            <div
                                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-300"
                                onClick={() => setShowExceptions(false)}
                            />
                            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-500 flex flex-col">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <h3 className="font-black text-bank-navy flex items-center gap-2 uppercase tracking-tight">
                                        <AlertCircle className="text-amber-500 w-5 h-5" />
                                        Exception Matrix
                                    </h3>
                                    <button
                                        onClick={() => setShowExceptions(false)}
                                        className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    {snapshot.exceptions.length === 0 ? (
                                        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                            <CheckCircle2 className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
                                            <p className="text-slate-400 font-extrabold text-xs uppercase tracking-widest">Parameters Optimal</p>
                                        </div>
                                    ) : (
                                        snapshot.exceptions.map(ex => (
                                            <div key={ex.id} className={`p-5 rounded-2xl border-l-8 shadow-sm transition-all hover:shadow-md ${ex.severity === 'CRITICAL' ? 'bg-red-50 border-red-500' :
                                                ex.severity === 'HIGH' ? 'bg-orange-50 border-orange-500' : 'bg-slate-50 border-slate-400'
                                                }`}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{ex.type}</span>
                                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${ex.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' :
                                                        ex.severity === 'HIGH' ? 'bg-orange-200 text-orange-800' : 'bg-slate-200 text-slate-700'
                                                        }`}>{ex.severity}</span>
                                                </div>
                                                <p className="text-sm font-black text-slate-800 mb-2 tracking-tight">{ex.parameter.replace(/_/g, ' ')}</p>
                                                <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">{ex.message}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-6 border-t border-slate-100 bg-slate-50/30">
                                    <button
                                        onClick={() => setShowExceptions(false)}
                                        className="w-full bg-bank-navy text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg"
                                    >
                                        Close Details
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default BusinessSnapshot;
