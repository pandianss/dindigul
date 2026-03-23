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
    PanelRightOpen,
    ShieldAlert,
    LayoutDashboard,
    ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ExceptionSummary from '../components/ExceptionSummary';

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
        parentParameterName?: string | null;
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
    const [showManagementView, setShowManagementView] = useState(['ADMIN', 'RO_USER', 'RO_MANAGER'].includes(user?.role || ''));

    useEffect(() => {
        if (!branchCode && ['ADMIN', 'RO_USER', 'RO_MANAGER'].includes(user?.role || '')) {
            setShowManagementView(true);
        }
    }, [branchCode, user?.role]);

    useEffect(() => {
        const fetchUnits = async () => {
            try {
                const res = await axios.get(`${API_BASE}/branches`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const sorted = res.data.sort((a: any, b: any) => {
                    const typeA = (a.type || '').toUpperCase();
                    const typeB = (b.type || '').toUpperCase();
                    const isROA = ['RO', 'REGIONAL', 'OFFICE', 'LPC'].some(t => typeA.includes(t));
                    const isROB = ['RO', 'REGIONAL', 'OFFICE', 'LPC'].some(t => typeB.includes(t));
                    if (isROA && !isROB) return -1;
                    if (!isROA && isROB) return 1;
                    return (a.code || '').localeCompare(b.code || '');
                });
                setUnits(sorted);
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
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to freeze snapshot.');
        }
    };

    useEffect(() => {
        fetchSnapshot();
    }, [branchCode, date]);

    const formatValue = (val: number, isPercent: boolean = false) => {
        if (isPercent) {
            return `${Math.round(val)}%`;
        }
        return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    };

    const getStatusStyle = (status: string) => {
        const s = (status || '').toUpperCase();
        switch (s) {
            case 'SURPASSED':
            case 'POSITIVE':
                return 'bg-bank-teal text-white';
            case 'ON-TRACK':
            case 'NEUTRAL':
            case 'LAGGING':
                return 'bg-blue-600 text-white';
            case 'BEHIND':
            case 'NEGATIVE':
                return 'bg-rose-500 text-white';
            default: return 'bg-slate-400 text-white';
        }
    };

    const isRateMetric = (metric: string) => {
        const lower = metric.toLowerCase();
        return lower.includes('%') || lower.includes('ratio') || lower.includes('yield') || lower.includes('cost');
    };

    const GrowthIndicator = ({ val, isInverse = false, isPercent = false }: { val: number, isInverse?: boolean, isPercent?: boolean }) => {
        if (Math.abs(val) < 0.01) return <span className="text-slate-200 font-medium">0.00</span>;
        const isPositive = isInverse ? val <= 0 : val >= 0;
        const colorClass = isPositive ? 'text-bank-teal' : 'text-rose-500';

        return (
            <div className={`flex items-center justify-end gap-0.5 ${colorClass}`}>
                <span className="font-bold text-[14px] font-mono tabular-nums tracking-tighter">{formatValue(Math.abs(val), isPercent)}</span>
                {val >= 0 ? <ArrowUpRight className="w-4 h-4 stroke-[2.5]" /> : <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />}
            </div>
        );
    };

    const getHeaderDates = () => {
        if (!snapshot?.businessDate) return null;
        const d = new Date(snapshot.businessDate);
        const utcDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

        const yesterday = new Date(utcDate); yesterday.setUTCDate(utcDate.getUTCDate() - 1);
        const prevMonthEnd = new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), 0));

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

    const calcPctVar = (growth: number, base: number) => {
        if (!base || base === 0) return 0;
        return (growth / Math.abs(base)) * 100;
    };

    const headerDates = getHeaderDates();

    return (
        <div className="p-6 bg-gray-50 min-h-screen text-[14px]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <Activity className="text-blue-600 w-8 h-8" />
                        Business Snapshot
                    </h1>
                    <p className="text-slate-500 font-medium ml-11 -mt-1 uppercase tracking-widest text-[10px]">Strategic Performance Monitoring</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {['ADMIN', 'RO_USER', 'RO_MANAGER'].includes(user?.role || '') && (
                        <button
                            onClick={() => setShowManagementView(!showManagementView)}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border transition-all font-bold text-sm shadow-sm ${showManagementView
                                ? 'bg-blue-50 border-blue-200 text-blue-600'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {showManagementView ? <LayoutDashboard size={16} /> : <ShieldAlert size={16} />}
                            {showManagementView ? 'Branch View' : 'Management Oversight'}
                        </button>
                    )}

                    <div className="flex flex-wrap gap-3">
                        {['ADMIN', 'RO_USER', 'RO_MANAGER'].includes(user?.role || '') && (
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm relative group">
                                <Search className="w-4 h-4 text-slate-400" />
                                <select
                                    value={branchCode}
                                    onChange={(e) => setBranchCode(e.target.value)}
                                    className="bg-transparent outline-none text-sm font-bold text-slate-700 cursor-pointer pr-4 appearance-none font-mono"
                                >
                                    <option value="">Select Unit</option>
                                    <optgroup label="Management & Oversight Units (RO/LPC)">
                                        {units.filter(u => ['RO', 'REGIONAL', 'OFFICE', 'LPC'].some(t => (u.type || '').toUpperCase().includes(t))).map(u => (
                                            <option key={u.code} value={u.code}>{u.code} - {u.nameEn}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Branches">
                                        {units.filter(u => !['RO', 'REGIONAL', 'OFFICE', 'LPC'].some(t => (u.type || '').toUpperCase().includes(t))).map(u => (
                                            <option key={u.code} value={u.code}>{u.code} - {u.nameEn}</option>
                                        ))}
                                    </optgroup>
                                </select>
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

                        {snapshot && snapshot.status !== 'FINAL' && (
                            <button
                                onClick={handleFreeze}
                                className="flex items-center gap-2 bg-bank-navy text-white px-5 py-2 rounded-xl hover:bg-slate-800 transition-all font-bold shadow-md shadow-slate-200"
                            >
                                <Lock className="w-4 h-4" />
                                Freeze Snapshot
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {showManagementView ? (
                <ExceptionSummary
                    selectedDate={date}
                    onSelectBranch={(code) => {
                        setBranchCode(code);
                        setShowManagementView(false);
                    }}
                />
            ) : (
                <>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 mb-8 animate-in slide-in-from-top duration-300">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 animate-pulse">
                            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Accessing Core Ledger...</p>
                        </div>
                    ) : (
                        <div id="capture-area">
                            {snapshot && (
                                <div className="space-y-8 pb-20">
                                    {(() => {
                                        const plData = snapshot.panelData.find(p => p.parameter === 'Branch_PL');
                                        const plWidget = plData ? (
                                            <div className="bg-gradient-to-br from-indigo-900 to-bank-navy rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group mb-10 border border-white/10">
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/10 transition-all duration-700" />
                                                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                                    <div className="flex items-center gap-5">
                                                        <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
                                                            <TrendingUp className="w-8 h-8 text-indigo-200" />
                                                        </div>
                                                        <div>
                                                            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-200/50 mb-1.5 font-mono">Real-Time Performance</h2>
                                                            <p className="text-3xl font-black tracking-tight flex items-center gap-3">
                                                                {plData.metadata.displayName}
                                                                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-500/30 uppercase tracking-widest font-black">Latest</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-10">
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-2">Status</p>
                                                            <span className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest border shadow-lg ${getStatusStyle(plData.status)}`}>
                                                                {plData.status}
                                                            </span>
                                                        </div>
                                                        <div className="h-12 w-px bg-white/10 hidden md:block" />
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Target Gap</p>
                                                            <div className="text-2xl font-black tracking-tighter flex items-center justify-end gap-2">
                                                                {formatValue(plData.gap_month)}
                                                                <GrowthIndicator val={plData.growth_day} isPercent={false} />
                                                            </div>
                                                        </div>
                                                        <div className="bg-white/10 rounded-3xl p-6 border border-white/5 backdrop-blur-sm shadow-inner min-w-[200px]">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200/50 mb-1">Current P&L</p>
                                                            <p className="text-4xl font-black tracking-tighter text-white">
                                                                {formatValue(plData.val_current)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null;

                                        const categories = Array.from(new Set((snapshot.panelData || []).filter(p => p.parameter !== 'Branch_PL').map(p => p.metadata?.category || 'Uncategorized')));

                                        if (categories.length === 0) {
                                            return (
                                                <div className="bg-white rounded-3xl shadow-xl p-20 text-center border border-slate-100">
                                                    <Layers className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                                    <h3 className="text-xl font-bold text-slate-400 font-black uppercase tracking-widest">No Metric Data</h3>
                                                    <p className="text-slate-400 mt-2 text-sm font-bold uppercase tracking-tight">The snapshot exists but contains no panel data records.</p>
                                                </div>
                                            );
                                        }

                                        const isRegional = ['RO', 'LPC', 'REGIONAL OFFICE'].includes(snapshot.branch?.type?.toUpperCase() || '');
                                        const unitLabel = isRegional ? 'Figures are in Crores' : 'Figures are in Lakhs';

                                        return (
                                            <>
                                                {plWidget}
                                                <div className="flex justify-end mb-4 px-4">
                                                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-2xl shadow-sm">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${isRegional ? 'bg-indigo-500' : 'bg-bank-teal'}`} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                            {unitLabel}
                                                        </span>
                                                    </div>
                                                </div>
                                                {categories.map(cat => {
                                                    const items = snapshot.panelData.filter(p => p.parameter !== 'Branch_PL' && (p.metadata?.category || 'Uncategorized') === cat);
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
                                                                    <div className={`px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-2 ${snapshot.status === 'FINAL' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                                        <div className={`w-2 h-2 rounded-full ${snapshot.status === 'FINAL' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                                                                        {snapshot.status}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="overflow-x-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-slate-200">
                                                                <table className="w-full text-[14px] border-collapse whitespace-nowrap">
                                                                    <thead className="sticky top-0 z-20 backdrop-blur-md bg-white/95">
                                                                        <tr className="text-slate-400 font-black uppercase tracking-[0.2em] text-[11px]">
                                                                            <th rowSpan={2} className="px-6 py-4 text-left border-r border-slate-100 bg-white min-w-[220px]">Parameters</th>
                                                                            <th colSpan={4} className="px-6 py-2 text-center border-r border-slate-100 border-t-2 border-slate-400 bg-slate-50/50">Historical Performance</th>
                                                                            <th colSpan={3} className="px-6 py-2 text-center border-r border-slate-100 border-t-2 border-bank-navy bg-slate-50/50">Current Trajectory</th>
                                                                            <th colSpan={4} className="px-6 py-2 text-center border-r border-slate-100 border-t-2 border-bank-teal bg-slate-50/50">Dynamic Variance</th>
                                                                            <th colSpan={3} className="px-6 py-2 text-center border-r border-slate-100 border-t-2 border-indigo-400 bg-slate-50/50">Monthly Objectives</th>
                                                                            <th colSpan={2} className="px-6 py-2 text-center border-t-2 border-amber-400 bg-slate-50/50">Quarterly Target</th>
                                                                        </tr>
                                                                        <tr className="border-b border-slate-100 bg-white text-slate-500 font-bold shadow-sm">
                                                                            <th className="px-4 py-3 text-right border-r border-slate-50">{headerDates?.prevFyStart}</th>
                                                                            <th className="px-4 py-3 text-right border-r border-slate-50">{headerDates?.prevFyEnd}</th>
                                                                            <th className="px-4 py-3 text-right border-r border-slate-50 text-slate-400 font-base uppercase text-[10px]">Var</th>
                                                                            <th className="px-4 py-3 text-right border-r border-slate-100 text-slate-400 font-base uppercase text-[10px]">Var %</th>

                                                                            <th className="px-4 py-3 text-right border-r border-slate-50">{headerDates?.monthEnd}</th>
                                                                            <th className="px-4 py-3 text-right border-r border-slate-50">{headerDates?.yesterday}</th>
                                                                            <th className="px-4 py-3 text-right border-r border-slate-100 font-black text-bank-navy bg-blue-50/50 ring-1 ring-inset ring-blue-100">{headerDates?.current}</th>

                                                                            <th className="px-4 py-3 text-right border-r border-slate-50 uppercase text-[10px]">Daily</th>
                                                                            <th className="px-4 py-3 text-right border-r border-slate-50 uppercase text-[10px]">MTD</th>
                                                                            <th className="px-4 py-3 text-right border-r border-slate-50 text-bank-teal uppercase text-[10px]">YTD</th>
                                                                            <th className="px-4 py-3 text-right border-r border-slate-100 font-bold text-bank-teal uppercase text-[10px]">YTD %</th>

                                                                            <th className="px-4 py-3 text-right border-r border-slate-50 text-[10px] uppercase">Budget</th>
                                                                            <th className="px-4 py-3 text-right border-r border-slate-50 text-indigo-600 text-[10px] uppercase">Gap</th>
                                                                            <th className="px-4 py-3 text-center border-r border-slate-100 text-[10px] uppercase">Status</th>

                                                                            <th className="px-4 py-3 text-right border-r border-slate-50 text-[10px] uppercase">Budget</th>
                                                                            <th className="px-4 py-3 text-right text-amber-600 text-[10px] uppercase">Gap</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-50 font-medium text-slate-600">
                                                                        {items.map((row) => {
                                                                            const isRate = isRateMetric(row.parameter);
                                                                            const isInverse = ['NPA', 'EXPENSE', 'COST', 'PROVISION'].some(k => row.parameter.toUpperCase().includes(k));
                                                                            const isPercentMetric = row.parameter.toUpperCase().includes('%') || row.parameter.toUpperCase().includes('RATIO');

                                                                            return (() => {
                                                                                const findParent = (paramName: string) => {
                                                                                    const p = snapshot.panelData.find(item => item.parameter === paramName);
                                                                                    const parentName = p?.metadata?.parentParameterName;
                                                                                    if (!parentName) return null;
                                                                                    return snapshot.panelData.find(item => item.parameter === parentName);
                                                                                };

                                                                                const getDepth = (paramName: string, currentDepth: number = 0): number => {
                                                                                    const parent = findParent(paramName);
                                                                                    // depth only if parent is in the same visual block
                                                                                    if (!parent || (parent.metadata?.category || 'Uncategorized') !== cat) return currentDepth;
                                                                                    return getDepth(parent.parameter, currentDepth + 1);
                                                                                };

                                                                                const getBranchRoot = (paramName: string): string | null => {
                                                                                    const branches = ['Core Ret', 'Core_Agri', 'MSME'];
                                                                                    if (branches.includes(paramName)) return paramName;
                                                                                    const parent = findParent(paramName);
                                                                                    if (!parent) return null;
                                                                                    return getBranchRoot(parent.parameter);
                                                                                };

                                                                                const depth = getDepth(row.parameter);
                                                                                const branchRoot = getBranchRoot(row.parameter);
                                                                                const isRoot = row.parameter === 'Bus';
                                                                                const isSubAggregate = ['Total Dep', 'Adv', 'Core Adv'].includes(row.parameter);
                                                                                const isMajorCategory = ['Gold', 'Core Adv', 'Core Ret', 'Core_Agri', 'MSME'].includes(row.parameter);

                                                                                let branchBg = '';
                                                                                let branchSolidBg = '';
                                                                                let branchBorder = '';
                                                                                let branchParentBorder = '';
                                                                                if (branchRoot === 'Core Ret') {
                                                                                    branchBg = 'bg-gradient-to-r from-indigo-50/50 to-transparent';
                                                                                    branchSolidBg = 'bg-[#f8faff]';
                                                                                    branchBorder = 'border-l-indigo-300';
                                                                                    branchParentBorder = 'border-l-indigo-600';
                                                                                } else if (branchRoot === 'Core_Agri') {
                                                                                    branchBg = 'bg-gradient-to-r from-emerald-50/50 to-transparent';
                                                                                    branchSolidBg = 'bg-[#f8fff9]';
                                                                                    branchBorder = 'border-l-emerald-300';
                                                                                    branchParentBorder = 'border-l-emerald-600';
                                                                                } else if (branchRoot === 'MSME') {
                                                                                    branchBg = 'bg-gradient-to-r from-sky-50/50 to-transparent';
                                                                                    branchSolidBg = 'bg-[#f8fbff]';
                                                                                    branchBorder = 'border-l-sky-300';
                                                                                    branchParentBorder = 'border-l-sky-600';
                                                                                }

                                                                                const rowClasses = `hover:bg-slate-50/80 transition-all group/row border-l-4 ${isMajorCategory ? (branchParentBorder || 'border-l-slate-400') : (branchBorder || 'border-l-transparent')} ${branchBg} ${isRoot ? 'bg-gradient-to-r from-blue-100/50 to-transparent border-l-4 border-l-bank-navy shadow-sm' : row.parameter === 'Gold' ? 'bg-gradient-to-r from-amber-50 to-transparent border-l-4 border-l-amber-400' : isSubAggregate ? 'bg-blue-50/30 border-l-4 border-l-bank-teal/50' : isMajorCategory ? 'shadow-[inset_4px_0_0_0_rgba(0,0,0,0.05)]' : ''}`;
                                                                                const cellClasses = `px-6 py-3 border-r border-slate-100 sticky left-0 z-10 group-hover/row:bg-slate-50/80 ${isRoot ? 'bg-[#f0f4ff]' : row.parameter === 'Gold' ? 'bg-[#fffdf5]' : isSubAggregate ? 'bg-[#f5f9ff]' : (branchSolidBg || 'bg-white')}`;
                                                                                const textClasses = `text-slate-800 group-hover/row:text-bank-navy transition-colors ${isRoot ? 'font-black text-[18px]' : (isSubAggregate || isMajorCategory) ? 'font-black text-[17px]' : 'font-bold text-[16px] leading-tight'}`;
                                                                                const paddingClass = depth > 0 ? { paddingLeft: `${depth * 24}px` } : {};

                                                                                return (
                                                                                    <tr key={row.id} className={rowClasses}>
                                                                                        <td className={cellClasses}>
                                                                                            <div className="flex items-center">
                                                                                                {depth > 0 && <div className="w-px h-6 bg-slate-200 mr-2" style={{ marginLeft: '-12px' }} />}
                                                                                                <div className={textClasses} style={paddingClass}>
                                                                                                    {row.metadata.displayName}
                                                                                                </div>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="px-4 py-3 text-right text-slate-400 border-r border-slate-50">{formatValue(row.val_prev_fy_start, isPercentMetric)}</td>
                                                                                        <td className="px-4 py-3 text-right text-slate-400 border-r border-slate-50">{formatValue(row.val_prev_fy_end, isPercentMetric)}</td>
                                                                                        <td className="px-4 py-3 text-right border-r border-slate-50 bg-slate-50/10">
                                                                                            {!isRate ? <GrowthIndicator val={row.growth_prev_fy} isInverse={isInverse} isPercent={isPercentMetric} /> : <span className="text-slate-200">-</span>}
                                                                                        </td>
                                                                                        <td className="px-4 py-3 text-right border-r border-slate-100 bg-slate-50/20">
                                                                                            {!isRate ? <GrowthIndicator val={calcPctVar(row.growth_prev_fy, row.val_prev_fy_start)} isInverse={isInverse} isPercent={true} /> : <span className="text-slate-200">-</span>}
                                                                                        </td>
                                                                                        <td className="px-4 py-3 text-right text-slate-500 border-r border-slate-50">{formatValue(row.val_prev_m_end, isPercentMetric)}</td>
                                                                                        <td className="px-4 py-3 text-right text-slate-500 border-r border-slate-50">{formatValue(row.val_y_eod, isPercentMetric)}</td>
                                                                                        <td className={`px-4 py-3 text-right border-r border-slate-100 font-black text-bank-navy text-[16px] bg-blue-50/30 ring-1 ring-inset ring-blue-50/50 ${isRoot ? 'text-[18px] bg-blue-100/20' : ''}`}>
                                                                                            {formatValue(row.val_current, isPercentMetric)}
                                                                                        </td>
                                                                                        <td className="px-4 py-3 text-right border-r border-slate-50">
                                                                                            {!isRate ? <GrowthIndicator val={row.growth_day} isInverse={isInverse} isPercent={isPercentMetric} /> : <span className="text-slate-200">-</span>}
                                                                                        </td>
                                                                                        <td className="px-4 py-3 text-right border-r border-slate-50">
                                                                                            {!isRate ? <GrowthIndicator val={row.growth_month} isInverse={isInverse} isPercent={isPercentMetric} /> : <span className="text-slate-200">-</span>}
                                                                                        </td>
                                                                                        <td className="px-4 py-3 text-right border-r border-slate-50 bg-bank-teal/5">
                                                                                            {!isRate ? <GrowthIndicator val={row.growth_fy} isInverse={isInverse} isPercent={isPercentMetric} /> : <span className="text-slate-200">-</span>}
                                                                                        </td>
                                                                                        <td className="px-4 py-3 text-right border-r border-slate-100 bg-bank-teal/10">
                                                                                            {!isRate ? <GrowthIndicator val={calcPctVar(row.growth_fy, row.val_fy_start)} isInverse={isInverse} isPercent={true} /> : <span className="text-slate-200">-</span>}
                                                                                        </td>
                                                                                        <td className="px-4 py-3 text-right text-slate-400 border-r border-slate-50">
                                                                                            {!isRate ? formatValue(row.budget_month, isPercentMetric) : <span className="text-slate-200 text-[11px]">N/A</span>}
                                                                                        </td>
                                                                                        <td className={`px-4 py-3 text-right font-bold border-r border-slate-50 ${(isInverse ? row.gap_month <= 0 : row.gap_month >= 0) ? 'text-bank-teal' : 'text-rose-500'}`}>
                                                                                            {!isRate ? formatValue(row.gap_month, isPercentMetric) : <span className="text-slate-200 text-[11px]">-</span>}
                                                                                        </td>
                                                                                        <td className="px-4 py-3 border-r border-slate-100 text-center bg-indigo-50/5">
                                                                                            {!isRate ? (
                                                                                                <span className={`px-3 py-1 rounded text-[11px] font-black uppercase tracking-tighter ${getStatusStyle(row.status)} shadow-[0_1px_2px_rgba(0,0,0,0.1)] opacity-90`}>
                                                                                                    {row.status}
                                                                                                </span>
                                                                                            ) : <span className="text-slate-200 text-[11px]">-</span>}
                                                                                        </td>
                                                                                        <th className="px-4 py-3 text-right border-r border-slate-50 text-[10px] uppercase">
                                                                                            {!isRate ? formatValue(row.budget_quarter, isPercentMetric) : <span className="text-slate-200 text-[11px]">N/A</span>}
                                                                                        </th>
                                                                                        <th className={`px-4 py-3 text-right font-bold border-l border-slate-50 ${(isInverse ? row.gap_quarter <= 0 : row.gap_quarter >= 0) ? 'text-bank-teal' : 'text-rose-500'}`}>
                                                                                            {!isRate ? formatValue(row.gap_quarter, isPercentMetric) : <span className="text-slate-200 text-[11px]">-</span>}
                                                                                        </th>
                                                                                    </tr>
                                                                                );
                                                                            })();
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        );
                                    })()}

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
                                                            <div key={ex.id} className={`p-5 rounded-2xl border-l-8 shadow-sm transition-all hover:shadow-md ${ex.severity === 'CRITICAL' ? 'bg-red-50 border-red-500' : ex.severity === 'HIGH' ? 'bg-orange-50 border-orange-500' : 'bg-slate-50 border-slate-400'}`}>
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{ex.type}</span>
                                                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${ex.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' : ex.severity === 'HIGH' ? 'bg-orange-200 text-orange-800' : 'bg-slate-200 text-slate-700'}`}>{ex.severity}</span>
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
                            {!snapshot && !loading && !error && branchCode && (
                                <div className="bg-white rounded-[2rem] shadow-xl p-20 text-center border border-slate-100 mt-8">
                                    <Activity className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-slate-400 font-black uppercase tracking-widest">Snapshot Missing</h3>
                                    <p className="text-slate-400 mt-2 text-sm font-bold uppercase tracking-tight">No business snapshot exists for SOL {branchCode} on this date.</p>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating}
                                        className="mt-6 inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-[11px]"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                                        {isGenerating ? 'Processing...' : 'Generate Now'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default BusinessSnapshot;
