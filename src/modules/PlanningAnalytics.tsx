import React, { useState, useEffect } from 'react';
import {
    Upload,
    FileText,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    Users,
    Calendar,
    Settings as SettingsIcon,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    IndianRupee
} from 'lucide-react';
import api from '../services/api';
import { format } from 'date-fns';
import { cn } from '../utils/cn';

const formatNumber = (num: number | string | undefined) => {
    if (num === undefined || num === null) return '0';
    const value = typeof num === 'string' ? parseFloat(num) : num;
    return new Intl.NumberFormat('en-IN').format(value);
};

const formatCurrency = (amount: number | string | undefined) => {
    if (amount === undefined || amount === null) return '₹0';
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value);
};

interface BranchStats {
    code: string;
    name: string;
    sbTotal: number;
    sbClosed: number;
    sbQualified: number;
    cdTotal: number;
    cdClosed: number;
    cdQualified: number;
    total: number;
    closed: number;
    net: number;
    qualified: number;
    lowBalance: number;
    avgBalance: number;
    sbRate: number;
    cdRate: number;
}

interface AnalyticsData {
    sbThreshold: number;
    cdThreshold: number;
    eligibleSchemes: string[];
    workingDays: {
        fy: number;
        thisMonth: number;
        lastMonth: number;
    };
    sb: {
        thisMonth: number;
        lastMonth: number;
        fy: number;
        fyTotal: number;
        fyClosed: number;
        fyNet: number;
        fyBalance: number;
        pace: string;
        total: number;
        closed: number;
        net: number;
        lastMonthTotal: number;
        lastMonthClosed: number;
        thisMonthBalance: number;
        dailyRunRate?: number;
        avgPerBranch?: number;
    };
    cd: {
        thisMonth: number;
        total: number;
        closed: number;
        net: number;
        thisMonthBalance: number;
        lastMonth: number;
        lastMonthTotal: number;
        lastMonthClosed: number;
        fy: number;
        fyTotal: number;
        fyClosed: number;
        fyNet: number;
        fyBalance: number;
        monthlyRunRate?: number;
        avgPerBranch?: number;
    };
    branchCount?: number;
    branchBreakdown: BranchStats[];
    branchBreakdownFY: BranchStats[];
    calendar?: {
        fyKey: string;
        monthKey: string;
    };
}

const PlanningAnalytics: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<AnalyticsData | null>(null);
    const [intelligence, setIntelligence] = useState<any | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [sbThreshold, setSbThreshold] = useState<number>(0);
    const [cdThreshold, setCdThreshold] = useState<number>(0);
    const [updatingThreshold, setUpdatingThreshold] = useState(false);
    const [uploadType, setUploadType] = useState<'opening' | 'closure'>('opening');
    const [eligibleSchemes, setEligibleSchemes] = useState<string>('');
    const [showSettings, setShowSettings] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'intelligence' | 'exceptions'>('overview');
    const [branchPeriod, setBranchPeriod] = useState<'month' | 'fy'>('month');

    useEffect(() => {
        fetchStats();
        fetchIntelligence();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/planning/analytics');
            setStats(response.data);
            setSbThreshold(response.data.sbThreshold || 500);
            setCdThreshold(response.data.cdThreshold || 1000);
            setEligibleSchemes(response.data.eligibleSchemes?.join(', ') || '');
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchIntelligence = async () => {
        try {
            const response = await api.get('/planning/intelligence-reports');
            setIntelligence(response.data);
        } catch (error) {
            console.error('Failed to fetch intelligence:', error);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setMessage(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const csvData = e.target?.result;
            try {
                const endpoint = uploadType === 'opening' ? '/planning/upload' : '/planning/upload-closures';
                const response = await api.post(endpoint, { csvData, date });
                const { message: msg, results } = response.data;
                const corruptedMsg = results?.corrupted > 0 ? ` (${results.corrupted} corrupted records skipped)` : '';
                setMessage({ type: 'success', text: `${msg}${corruptedMsg}` });
                setFile(null);
                fetchStats(); // Refresh stats
            } catch (error: any) {
                setMessage({ type: 'error', text: error.response?.data?.error || 'Upload failed' });
            } finally {
                setUploading(false);
            }
        };
        reader.readAsText(file);
    };

    const handleUpdateThreshold = async () => {
        setUpdatingThreshold(true);
        try {
            console.log('Starting threshold updates:', { sbThreshold, cdThreshold });

            // Sequential updates to avoid potential race conditions or proxy issues
            await api.post('/planning/config', { key: 'MIN_SB_BALANCE_THRESHOLD', value: sbThreshold });
            console.log('SB Threshold updated');

            await api.post('/planning/config', { key: 'MIN_CD_BALANCE_THRESHOLD', value: cdThreshold });
            console.log('CD Threshold updated');

            // Save schemes as JSON array
            const schemesArray = eligibleSchemes.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
            await api.post('/planning/config', { key: 'PRODUCT_ADOPTION_SCHEMES', value: schemesArray });
            console.log('Schemes updated');

            setMessage({ type: 'success', text: 'Performance thresholds updated successfully' });
            await fetchStats();
            setShowSettings(false);
        } catch (error: any) {
            console.error('Failed to update thresholds:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
            setMessage({ type: 'error', text: `Failed: ${errorMsg}` });
        } finally {
            setUpdatingThreshold(false);
        }
    };

    const filteredBranches = (branchPeriod === 'month' ? stats?.branchBreakdown : stats?.branchBreakdownFY)?.filter(b =>
        b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.code.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-bank-teal/20 border-t-bank-teal rounded-full animate-spin mb-4" />
                <p className="text-gray-400 font-bold tracking-widest text-[10px] uppercase">Calculating Metrics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-bank-navy tracking-tight uppercase">Advanced Analytics</h2>
                    <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-wider">Lineage, Growth & Intelligence Hub</p>
                </div>
                <div className="flex items-center bg-gray-100 p-1 rounded-2xl shadow-inner">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                            activeTab === 'overview' ? "bg-white text-bank-navy shadow-sm" : "text-gray-400 hover:text-gray-600")}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('intelligence')}
                        className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                            activeTab === 'intelligence' ? "bg-white text-bank-navy shadow-sm" : "text-gray-400 hover:text-gray-600")}
                    >
                        Intelligence Hub
                    </button>
                    <button
                        onClick={() => setActiveTab('exceptions')}
                        className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                            activeTab === 'exceptions' ? "bg-white text-bank-navy shadow-sm" : "text-gray-400 hover:text-gray-600")}
                    >
                        Compliance
                    </button>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-gray-500 hover:text-bank-navy shadow-sm"
                    >
                        <SettingsIcon size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Settings</span>
                    </button>
                </div>
            </div>

            {showSettings && (
                <div className="card p-6 border-2 border-bank-gold/20 bg-bank-gold/5 animate-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-bank-navy flex items-center space-x-2 text-sm uppercase tracking-widest">
                            <SettingsIcon size={16} />
                            <span>Analytics Configuration</span>
                        </h3>
                        <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xs uppercase">Close</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SB Min. Balance Threshold</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={sbThreshold}
                                    onChange={(e) => setSbThreshold(Number(e.target.value))}
                                    className="w-full bg-white border border-bank-navy/10 rounded-xl px-4 py-3 text-sm font-black text-bank-navy focus:ring-2 focus:ring-bank-teal/20 outline-none transition-all"
                                    placeholder="e.g. 500"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-300 uppercase">INR</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CD Min. Balance Threshold</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={cdThreshold}
                                    onChange={(e) => setCdThreshold(Number(e.target.value))}
                                    className="w-full bg-white border border-bank-navy/10 rounded-xl px-4 py-3 text-sm font-black text-bank-navy focus:ring-2 focus:ring-bank-teal/20 outline-none transition-all"
                                    placeholder="e.g. 1000"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-300 uppercase">INR</span>
                            </div>
                        </div>
                        <div className="space-y-2 lg:col-span-2 mt-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Eligible Product Schemes</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={eligibleSchemes}
                                    onChange={(e) => setEligibleSchemes(e.target.value)}
                                    className="w-full bg-white border border-bank-navy/10 rounded-xl px-4 py-3 text-sm font-black text-bank-navy focus:ring-2 focus:ring-bank-teal/20 outline-none transition-all"
                                    placeholder="e.g. SBREG, CDGEN, SBNRE"
                                />
                            </div>
                            <p className="text-[9px] text-gray-400 font-bold uppercase italic">Comma-separated scheme codes. Leave entry empty to allow all schemes.</p>
                        </div>
                        <button
                            onClick={handleUpdateThreshold}
                            disabled={updatingThreshold}
                            className="bg-bank-navy text-white text-[10px] font-black uppercase tracking-widest px-8 py-4 rounded-xl hover:bg-bank-navy/90 transition-all shadow-lg shadow-bank-navy/10 disabled:opacity-50"
                        >
                            {updatingThreshold ? 'Saving...' : 'Apply Thresholds'}
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-4 italic font-medium">Changing this will recalculate all performance metrics across the dashboard.</p>
                </div>
            )}

            {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Context & Controls Header */}
                    <div className="space-y-3">
                        {/* Compact Working Days Context Bar */}
                        <div className="flex items-center space-x-6 px-5 py-3 bg-gray-50/50 rounded-2xl border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <div className="flex items-center space-x-2 border-r border-gray-200 pr-4">
                                <Calendar size={14} className="text-bank-teal" />
                                <span className="text-bank-navy">Working Context:</span>
                            </div>
                            <div className="flex items-center space-x-6">
                                <div className="flex items-center space-x-2">
                                    <span className="text-gray-400">Month:</span>
                                    <span className="text-bank-navy bg-white px-2 py-0.5 rounded shadow-sm">{stats?.workingDays.thisMonth} Days</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-gray-400">Previous:</span>
                                    <span className="text-bank-navy/60">{stats?.workingDays.lastMonth}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-gray-400">FY {stats?.calendar?.fyKey}:</span>
                                    <span className="text-bank-navy/60">{stats?.workingDays.fy}</span>
                                </div>
                            </div>
                            <div className="flex-1 text-right">
                                <span className="text-[9px] text-gray-300 italic">Financial Period Hierarchy</span>
                            </div>
                        </div>

                        {/* Compact Data Ingestion Strip */}
                        <div className="flex items-center space-x-4 bg-white border border-gray-100 rounded-2xl p-2 shadow-sm animate-in slide-in-from-top-2">
                            <div className="flex items-center space-x-2 px-3 border-r border-gray-100">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Type:</span>
                                <select
                                    value={uploadType}
                                    onChange={(e) => setUploadType(e.target.value as 'opening' | 'closure')}
                                    className="bg-transparent border-none text-[10px] font-black text-bank-navy outline-none focus:ring-0 cursor-pointer"
                                >
                                    <option value="opening">Openings</option>
                                    <option value="closure">Closures</option>
                                </select>
                            </div>
                            <div className="flex items-center space-x-2 px-3 border-r border-gray-100">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Date:</span>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="bg-transparent border-none text-[10px] font-black text-bank-navy outline-none focus:ring-0 w-32"
                                />
                            </div>
                            <div className="flex-1 flex items-center space-x-3 px-2 min-w-0">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                                    {file ? file.name : `Select ${uploadType === 'opening' ? 'Account Opening' : 'Account Closure'} CSV`}
                                </span>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="file-upload-compact"
                                />
                                {!file ? (
                                    <label htmlFor="file-upload-compact" className="flex-shrink-0 px-3 py-1.5 bg-gray-50 text-[9px] font-black uppercase tracking-widest rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-all">
                                        Browse
                                    </label>
                                ) : (
                                    <button onClick={() => setFile(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                                        <AlertCircle size={16} />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={handleUpload}
                                    disabled={!file || uploading}
                                    className="bg-bank-navy text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-bank-navy/10 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none whitespace-nowrap"
                                >
                                    {uploading ? 'Processing...' : 'Process & Sync'}
                                </button>
                                {message && (
                                    <div className={cn(
                                        "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest animate-in slide-in-from-right-2",
                                        message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                    )}>
                                        {message.text}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Stats Summary */}
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* SB Analytics */}
                            <div className="card p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-bank-teal/10 rounded-lg text-bank-teal">
                                        <Users size={20} />
                                    </div>
                                    <span className="text-[10px] font-black text-bank-teal bg-bank-teal/5 px-2 py-1 rounded">SB ACCOUNTS (Above {stats?.sbThreshold})</span>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-3xl font-black text-bank-navy tracking-tighter">{formatNumber(stats?.sb.net)}</h4>
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <p className="text-[10px] font-bold text-bank-teal uppercase tracking-widest">Net Growth this month</p>
                                            <p className="text-[8px] font-medium text-gray-400 uppercase">(Qual: {formatNumber(stats?.sb.thisMonth)} | Closures: {formatNumber(stats?.sb.closed)})</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-bank-navy">Avg {stats?.sb.avgPerBranch?.toFixed(1)}</span>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">per branch</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-y-4 gap-x-6">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Growth Balance</p>
                                        <div className="mt-1 font-black text-bank-teal tracking-tight text-lg">{formatCurrency(stats?.sb.thisMonthBalance)}</div>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">current month</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Month Net</p>
                                        <div className="mt-1 font-black text-bank-navy opacity-50 text-lg">
                                            {formatNumber((stats?.sb.lastMonthTotal || 0) - (stats?.sb.lastMonthClosed || 0))}
                                            <span className="text-[8px] ml-1 font-bold text-gray-400">(Q: {formatNumber(stats?.sb.lastMonth)})</span>
                                        </div>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">Net Performance</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">FY Net growth</p>
                                        <div className="mt-1 font-black text-bank-navy tracking-tight text-lg">
                                            {formatNumber(stats?.sb.fyNet)}
                                            <span className="text-[8px] ml-1 font-bold text-gray-400">(Q: {formatNumber(stats?.sb.fy)})</span>
                                        </div>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">Total FY Net</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">FY Net Balance</p>
                                        <div className="mt-1 font-black text-bank-teal tracking-tight text-lg">{formatCurrency(stats?.sb.fyBalance)}</div>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">FY cumulative balance</p>
                                    </div>
                                </div>
                            </div>

                            {/* CD Analytics */}
                            <div className="card p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-bank-gold/10 rounded-lg text-bank-gold">
                                        <TrendingUp size={20} />
                                    </div>
                                    <span className="text-[10px] font-black text-bank-gold bg-bank-gold/5 px-2 py-1 rounded">CD ACCOUNTS</span>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-3xl font-black text-bank-navy tracking-tighter">{formatNumber(stats?.cd.net)}</h4>
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <p className="text-[10px] font-bold text-bank-gold uppercase tracking-widest">Net Growth this month</p>
                                            <p className="text-[8px] font-medium text-gray-400 uppercase">(Qual: {formatNumber(stats?.cd.thisMonth)} | Closures: {formatNumber(stats?.cd.closed)})</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-bank-navy">Avg {stats?.cd.avgPerBranch?.toFixed(1)}</span>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">per branch</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-y-4 gap-x-6">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Growth Balance</p>
                                        <div className="mt-1 font-black text-bank-gold tracking-tight text-lg">{formatCurrency(stats?.cd.thisMonthBalance)}</div>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">current month</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Month Net</p>
                                        <div className="mt-1 font-black text-bank-navy opacity-50 text-lg">
                                            {formatNumber((stats?.cd.lastMonthTotal || 0) - (stats?.cd.lastMonthClosed || 0))}
                                            <span className="text-[8px] ml-1 font-bold text-gray-400">(Q: {formatNumber(stats?.cd.lastMonth)})</span>
                                        </div>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">Net Performance</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">FY Net growth</p>
                                        <div className="mt-1 font-black text-bank-navy tracking-tight text-lg">
                                            {formatNumber(stats?.cd.fyNet)}
                                            <span className="text-[8px] ml-1 font-bold text-gray-400">(Q: {formatNumber(stats?.cd.fy)})</span>
                                        </div>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">Total FY Net</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">FY Net Balance</p>
                                        <div className="mt-1 font-black text-bank-gold tracking-tight text-lg">{formatCurrency(stats?.cd.fyBalance)}</div>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">FY cumulative balance</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Branch Performance Breakdown */}
                    <div className="card p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h4 className="text-sm font-black text-bank-navy uppercase tracking-widest">Branch-wise Performance</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest">
                                    Based on {branchPeriod === 'month' ? 'current month' : 'financial year'} openings
                                </p>
                            </div>
                            <div className="flex items-center space-x-6">
                                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                                    <button
                                        onClick={() => setBranchPeriod('month')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                            branchPeriod === 'month' ? "bg-white text-bank-navy shadow-sm border border-gray-100" : "text-gray-400 hover:text-bank-navy"
                                        )}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        onClick={() => setBranchPeriod('fy')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                            branchPeriod === 'fy' ? "bg-white text-bank-navy shadow-sm border border-gray-100" : "text-gray-400 hover:text-bank-navy"
                                        )}
                                    >
                                        FY {stats?.calendar?.fyKey}
                                    </button>
                                </div>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search SOL ID / Name"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-bank-navy w-64"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <th className="text-left px-4 py-2">Branch Details</th>
                                        <th className="text-center px-4 py-2">SB Metrics (Gross/Cls | Qual/Net)</th>
                                        <th className="text-center px-4 py-2">CD Metrics (Gross/Cls | Qual/Net)</th>
                                        <th className="text-center px-4 py-2">Total Qual/Net</th>
                                        <th className="text-center px-4 py-2">Net Rate</th>
                                        <th className="text-center px-4 py-2">Avg. Bal</th>
                                        <th className="text-right px-4 py-2">Efficiency</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBranches.length > 0 ? filteredBranches.map((branch) => (
                                        <tr key={branch.code} className="group hover:bg-gray-50/50 transition-all animate-in fade-in duration-500">
                                            <td className="px-4 py-4 bg-white border-y border-l rounded-l-2xl border-gray-100 group-hover:border-bank-navy/10">
                                                <div className="flex items-center space-x-3 text-left">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-50 text-bank-navy flex items-center justify-center font-black text-[10px]">
                                                        {branch.code}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-bank-navy tracking-tight">{branch.name}</p>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase">SOL ID: {branch.code}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 bg-white border-y border-gray-100 group-hover:border-bank-navy/10 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 min-w-[120px]">
                                                        <div className="flex flex-col h-full justify-between">
                                                            <span className="text-[11px] font-black text-bank-navy leading-none">{formatNumber(branch.sbTotal)}</span>
                                                            <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">Gross</span>
                                                        </div>
                                                        <div className="flex flex-col h-full justify-between">
                                                            <span className="text-[11px] font-black text-red-500 leading-none">{formatNumber(branch.sbClosed)}</span>
                                                            <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">Closed</span>
                                                        </div>
                                                        <div className="flex flex-col h-full justify-between">
                                                            <span className="text-[11px] font-black text-bank-teal leading-none">{formatNumber(branch.sbQualified)}</span>
                                                            <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">Qualified</span>
                                                        </div>
                                                        <div className="flex flex-col h-full justify-between border-l border-gray-100 pl-3">
                                                            <span className="text-[11px] font-black text-bank-navy leading-none">{formatNumber(branch.sbQualified - branch.sbClosed)}</span>
                                                            <span className="text-[7px] font-black text-bank-teal uppercase tracking-tighter">Net</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 bg-white border-y border-gray-100 group-hover:border-bank-navy/10 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 min-w-[120px]">
                                                        <div className="flex flex-col h-full justify-between">
                                                            <span className="text-[11px] font-black text-bank-navy leading-none">{formatNumber(branch.cdTotal)}</span>
                                                            <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">Gross</span>
                                                        </div>
                                                        <div className="flex flex-col h-full justify-between">
                                                            <span className="text-[11px] font-black text-red-500 leading-none">{formatNumber(branch.cdClosed)}</span>
                                                            <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">Closed</span>
                                                        </div>
                                                        <div className="flex flex-col h-full justify-between">
                                                            <span className="text-[11px] font-black text-bank-gold leading-none">{formatNumber(branch.cdQualified)}</span>
                                                            <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">Qualified</span>
                                                        </div>
                                                        <div className="flex flex-col h-full justify-between border-l border-gray-100 pl-3">
                                                            <span className="text-[11px] font-black text-bank-navy leading-none">{formatNumber(branch.cdQualified - branch.cdClosed)}</span>
                                                            <span className="text-[7px] font-black text-bank-gold uppercase tracking-tighter">Net</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 bg-white border-y border-gray-100 group-hover:border-bank-navy/10 text-center">
                                                <div className="flex flex-col items-center font-black">
                                                    <span className="text-sm text-bank-navy">{formatNumber(branch.qualified)} / {formatNumber(branch.net)}</span>
                                                    <span className="text-[8px] text-gray-400 uppercase">Qual / Net</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 bg-white border-y border-gray-100 group-hover:border-bank-navy/10 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center space-x-1">
                                                        <span className="text-[10px] font-black text-bank-navy">{branch.sbRate.toFixed(1)}</span>
                                                        <span className="text-[7px] font-bold text-bank-teal uppercase">SB/Day</span>
                                                    </div>
                                                    <span className="text-[6px] text-gray-400 uppercase font-bold">({branchPeriod === 'month' ? 'Current Month' : 'FY to Date'})</span>
                                                </div>
                                                <div className="flex flex-col items-center border-t border-gray-50 pt-1">
                                                    <div className="flex items-center space-x-1">
                                                        <span className="text-[10px] font-black text-bank-navy">{branch.cdRate.toFixed(1)}</span>
                                                        <span className="text-[7px] font-bold text-bank-gold uppercase">CD/Mo</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 bg-white border-y border-gray-100 group-hover:border-bank-navy/10 text-center">
                                                <span className="text-sm font-black text-bank-navy">{formatCurrency(branch.avgBalance)}</span>
                                            </td>
                                            <td className="px-4 py-4 bg-white border-y border-r rounded-r-2xl border-gray-100 group-hover:border-bank-navy/10 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={cn("h-full transition-all duration-1000", branch.total > 0 ? "bg-bank-teal" : "bg-gray-200")}
                                                            style={{ width: `${Math.min((branch.qualified / (branch.total || 1)) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-black text-bank-navy">
                                                        {branch.total > 0 ? `${((branch.qualified / branch.total) * 100).toFixed(0)}%` : '0%'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center">
                                                <div className="flex flex-col items-center space-y-4">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200">
                                                        <Users size={32} />
                                                    </div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No branch records found for this period</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'intelligence' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Customers */}
                        <div className="card p-8">
                            <h4 className="text-xs font-black text-bank-navy uppercase tracking-widest mb-6 flex items-center space-x-2">
                                <Users size={16} className="text-bank-gold" />
                                <span>High Value Acquisition Ranking</span>
                            </h4>
                            <div className="space-y-4">
                                {intelligence?.topCustomers?.map((cust: any, idx: number) => (
                                    <div key={cust.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-bank-gold transition-all">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-8 h-8 rounded-full bg-bank-gold/10 text-bank-gold flex items-center justify-center font-black text-[10px]">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-bank-navy">{cust.acctName}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase">{cust.branch.nameEn} • {cust.schmCode}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-bank-teal">{formatCurrency(cust.clrBalAmt)}</p>
                                            <div className="flex items-center justify-end space-x-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                <span className="text-[8px] font-black text-gray-500 uppercase">{cust.valueBucket}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Scheme Adoption */}
                        <div className="card p-8">
                            <h4 className="text-xs font-black text-bank-navy uppercase tracking-widest mb-6 flex items-center space-x-2">
                                <TrendingUp size={16} className="text-bank-teal" />
                                <span>Product Adoption Leaderboard</span>
                            </h4>
                            <div className="space-y-6">
                                {intelligence?.schemeAdoption?.map((scheme: any) => (
                                    <div key={scheme.schmCode} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-xs font-black text-bank-navy uppercase tracking-tight">{scheme.schmCode}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase">{scheme.accountClass} SERIES</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-black text-bank-navy">{scheme._count.foracid} ACCTS</span>
                                            </div>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-bank-teal transition-all duration-1000"
                                                style={{ width: `${Math.min((scheme._count.foracid / (intelligence?.topCustomers?.length * 2 || 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-[8px] font-black text-gray-400 text-right uppercase">Avg Funding: {formatCurrency(scheme._avg.clrBalAmt)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'exceptions' && (
                <div className="animate-in fade-in duration-500">
                    <div className="card p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h4 className="text-sm font-black text-bank-navy uppercase tracking-widest">Compliance & Quality Exceptions</h4>
                            <div className="flex items-center space-x-2">
                                <AlertCircle size={14} className="text-red-500" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Auto-detected Rejections</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                        <th className="pb-4 px-2">Account Details</th>
                                        <th className="pb-4 px-2">Opening Bal</th>
                                        <th className="pb-4 px-2">Validation Status</th>
                                        <th className="pb-4 px-2">Rejection Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {intelligence?.rejectionSummary?.map((rej: any) => (
                                        <tr key={rej.rejectionReason || 'unknown'} className="border-b border-gray-50 group hover:bg-gray-50/50">
                                            <td className="py-4 px-2">
                                                <p className="text-xs font-black text-bank-navy uppercase">{rej.rejectionReason || 'UNSPECIFIED'}</p>
                                            </td>
                                            <td className="py-4 px-2">
                                                <span className="text-[10px] font-bold text-gray-500">Qualification Batch</span>
                                            </td>
                                            <td className="py-4 px-2">
                                                <div className="flex items-center space-x-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                    <span className="text-[9px] font-black text-red-600 uppercase">Rejected</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm font-black text-bank-navy">{formatNumber(rej._count.foracid)}</span>
                                                    <span className="text-[8px] font-bold text-gray-400 uppercase">Records</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!intelligence?.rejectionSummary || intelligence.rejectionSummary.length === 0) && (
                                        <tr>
                                            <td colSpan={4} className="py-20 text-center">
                                                <div className="flex flex-col items-center space-y-4">
                                                    <CheckCircle size={32} className="text-green-300" />
                                                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest tracking-widest">No compliance exceptions detected for this period.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Detailed Rejection Breakdown */}
                    {intelligence?.rejectedSchemes?.length > 0 && (
                        <div className="mt-6 card p-8 bg-gray-50/30">
                            <h4 className="text-[10px] font-black text-bank-navy uppercase tracking-widest mb-6 border-b border-gray-100 pb-4">Detailed Scheme Rejections (Top 10)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                {intelligence.rejectedSchemes.map((rej: any) => (
                                    <div key={rej.schmCode} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                        <p className="text-xs font-black text-bank-navy uppercase">{rej.schmCode}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-[14px] font-black text-red-500">{formatNumber(rej._count.foracid)}</span>
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Accounts</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[9px] text-gray-400 mt-6 italic font-medium uppercase tracking-widest text-center border-t border-gray-100 pt-6">
                                <span className="text-bank-teal">Pro-tip:</span> Add these codes to the "Eligible Product Schemes" in settings to qualify them.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PlanningAnalytics;
