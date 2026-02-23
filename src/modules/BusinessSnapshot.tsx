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
    Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface SnapshotPanelData {
    id: string;
    parameter: string;
    val_current: number;
    val_y_eod: number;
    growth_day: number;
    growth_month: number;
    growth_fy: number;
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
    const [branchCode, setBranchCode] = useState(
        user?.role === 'ADMIN'
            ? 'RO_DGL'
            : (user as any)?.branch?.code || ''
    );
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [snapshot, setSnapshot] = useState<MisSnapshot | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

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
            if (err.response?.status !== 404) {
                setError('Failed to fetch snapshot data.');
            }
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

    const GrowthIndicator = ({ val }: { val: number }) => {
        if (Math.abs(val) < 0.01) return <span className="text-gray-400">0.00</span>;
        return (
            <div className={`flex items-center gap-1 ${val >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {val >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 rotate-180" />}
                <span className="font-medium">{formatValue(Math.abs(val))}</span>
            </div>
        );
    };

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
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={branchCode}
                                onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                                className="w-24 outline-none text-sm font-bold text-slate-700"
                                placeholder="BRANCH"
                            />
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
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Metrics Grid */}
                    <div className="lg:col-span-3 space-y-8">
                        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-100 bg-white flex justify-between items-center">
                                <div>
                                    <h3 className="font-black text-slate-800 uppercase tracking-tight">Financial Performance KPIs</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{snapshot.branch?.nameEn || 'Unit Data'}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-2 ${snapshot.status === 'FINAL' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full ${snapshot.status === 'FINAL' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                                        {snapshot.status}
                                    </div>
                                    {snapshot.status !== 'FINAL' && (
                                        <button
                                            onClick={handleFreeze}
                                            className="text-xs flex items-center gap-1.5 bg-slate-800 text-white px-4 py-1.5 rounded-lg hover:bg-black font-black transition-all shadow-lg shadow-slate-200"
                                        >
                                            <Lock className="w-3 h-3" />
                                            FREEZE SNAPSHOT
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                                        <tr>
                                            <th className="px-8 py-4 text-left font-black uppercase tracking-wider text-[10px]">Metric Parameter</th>
                                            <th className="px-8 py-4 text-right font-black uppercase tracking-wider text-[10px]">Current Balance</th>
                                            <th className="px-8 py-4 text-right font-black uppercase tracking-wider text-[10px]">Daily Var</th>
                                            <th className="px-8 py-4 text-right font-black uppercase tracking-wider text-[10px]">Monthly (MTD)</th>
                                            <th className="px-8 py-4 text-right font-black uppercase tracking-wider text-[10px]">Fiscal (YTD)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {snapshot.panelData.map((row) => (
                                            <tr key={row.id} className="hover:bg-blue-50/20 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <div className="font-bold text-slate-700 group-hover:text-blue-700 transition-colors uppercase tracking-tight">{row.parameter.replace(/_/g, ' ')}</div>
                                                </td>
                                                <td className="px-8 py-5 text-right font-mono font-black text-slate-900 text-lg">
                                                    {formatValue(row.val_current)}
                                                </td>
                                                <td className="px-8 py-5 text-right"><GrowthIndicator val={row.growth_day} /></td>
                                                <td className="px-8 py-5 text-right"><GrowthIndicator val={row.growth_month} /></td>
                                                <td className="px-8 py-5 text-right"><GrowthIndicator val={row.growth_fy} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Additional Info / Charts could go here */}
                    </div>

                    {/* Exceptions Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 sticky top-6">
                            <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-tight">
                                <AlertCircle className="text-amber-500 w-5 h-5" />
                                Exception Matrix
                            </h3>
                            <div className="space-y-4">
                                {snapshot.exceptions.length === 0 ? (
                                    <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Parameters Optimal</p>
                                    </div>
                                ) : (
                                    snapshot.exceptions.map(ex => (
                                        <div key={ex.id} className={`p-4 rounded-2xl border-l-8 shadow-sm ${ex.severity === 'CRITICAL' ? 'bg-red-50 border-red-500' :
                                            ex.severity === 'HIGH' ? 'bg-orange-50 border-orange-500' : 'bg-slate-50 border-slate-400'
                                            }`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{ex.type}</span>
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${ex.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' :
                                                    ex.severity === 'HIGH' ? 'bg-orange-200 text-orange-800' : 'bg-slate-200 text-slate-700'
                                                    }`}>{ex.severity}</span>
                                            </div>
                                            <p className="text-sm font-black text-slate-800 mb-1 tracking-tight">{ex.parameter.replace(/_/g, ' ')}</p>
                                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{ex.message}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BusinessSnapshot;
