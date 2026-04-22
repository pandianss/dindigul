import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Activity, RefreshCw, AlertCircle, PanelRightOpen, Layers } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { formatLocalISO } from '../../utils/dateUtils';
import ExceptionSummary from '../../components/ExceptionSummary';

// Local modular components
import { MisSnapshot, SnapshotPanelData, IntelligenceData } from './types';
import { getHeaderDates } from './utils';
import { SnapshotHeader } from './components/SnapshotHeader';
import { PerformanceWidget } from './components/PerformanceWidget';
import { MetricTable } from './components/MetricTable';
import { IntelligenceHub } from './components/IntelligenceHub';
import { ExceptionMatrix } from './components/ExceptionMatrix';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const BusinessSnapshot: React.FC = () => {
    const { user } = useAuth();
    const token = sessionStorage.getItem('token') || (user as any)?.token;
    const [branchCode, setBranchCode] = useState((user as any)?.branch?.code || '');
    const [date, setDate] = useState(formatLocalISO(new Date()));
    const [snapshot, setSnapshot] = useState<MisSnapshot | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [intelligence, setIntelligence] = useState<IntelligenceData | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [units, setUnits] = useState<any[]>([]);
    const [showExceptions, setShowExceptions] = useState(false);
    const [showManagementView, setShowManagementView] = useState(['ADMIN', 'RO_USER', 'RO_MANAGER'].includes(user?.role || ''));

    const fetchUnits = useCallback(async () => {
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
    }, [token, user?.role, branchCode]);

    const fetchIntelligence = useCallback(async () => {
        if (!branchCode) return;
        try {
            const response = await axios.get(`${API_BASE}/planning/intelligence-reports?solId=${branchCode}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIntelligence(response.data);
        } catch (err) {
            console.error('Failed to fetch intelligence:', err);
        }
    }, [branchCode, token]);

    const fetchSnapshot = useCallback(async () => {
        if (!branchCode) return;
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE}/mis/business-snapshot/${branchCode}?date=${date}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data;
            if (data?.panelData) {
                const tdRow = data.panelData.find((p: any) => p.parameter === 'TD');
                const bulkRow = data.panelData.find((p: any) => p.parameter === 'Bulk_Dep');
                const retTdRow = data.panelData.find((p: any) => p.parameter === 'Ret_TD');

                if (tdRow && bulkRow && retTdRow) {
                    const keys: Array<keyof SnapshotPanelData> = [
                        'val_prev_fy_start', 'val_prev_fy_end', 'val_fy_start', 
                        'val_prev_m_end', 'val_dby', 'val_y_eod'
                    ];

                    keys.forEach(key => {
                        if ((Number(retTdRow[key]) || 0) === 0 && (Number(tdRow[key]) || 0) !== 0) {
                            (retTdRow as any)[key] = Number(tdRow[key]) - Number(bulkRow[key] || 0);
                        }
                    });

                    if ((Number(retTdRow.growth_fy) || 0) === 0 && (Number(retTdRow.val_fy_start) || 0) !== 0) {
                        retTdRow.growth_fy = Number(retTdRow.val_current) - Number(retTdRow.val_fy_start);
                    }
                }
            }
            setSnapshot(data);
            fetchIntelligence();
        } catch (err: any) {
            setSnapshot(null);
            setError(err.response?.data?.error || 'Failed to fetch snapshot data.');
        } finally {
            setLoading(false);
        }
    }, [branchCode, date, token, fetchIntelligence]);

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
        if (!branchCode && ['ADMIN', 'RO_USER', 'RO_MANAGER'].includes(user?.role || '')) {
            setShowManagementView(true);
        }
    }, [branchCode, user?.role]);

    useEffect(() => {
        fetchUnits();
    }, [fetchUnits]);

    useEffect(() => {
        fetchSnapshot();
    }, [branchCode, date, fetchSnapshot]);

    const headerDates = getHeaderDates(snapshot);
    const categories = Array.from(new Set((snapshot?.panelData || []).filter(p => p.parameter !== 'Branch_PL').map(p => p.metadata?.category || 'Uncategorized')));
    const isRegional = ['RO', 'LPC', 'REGIONAL OFFICE'].includes(snapshot?.branch?.type?.toUpperCase() || '');
    const unitLabel = isRegional ? 'Figures are in Crores' : 'Figures are in Lakhs';

    return (
        <div className="p-6 bg-gray-50 min-h-screen text-[14px]">
            <SnapshotHeader 
                user={user}
                showManagementView={showManagementView}
                setShowManagementView={setShowManagementView}
                branchCode={branchCode}
                setBranchCode={setBranchCode}
                units={units}
                date={date}
                setDate={setDate}
                handleGenerate={handleGenerate}
                handleFreeze={handleFreeze}
                isGenerating={isGenerating}
                snapshot={snapshot}
            />

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
                                    <PerformanceWidget snapshot={snapshot} />

                                    {categories.length === 0 ? (
                                        <div className="bg-white rounded-3xl shadow-xl p-20 text-center border border-slate-100">
                                            <Layers className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                            <h3 className="text-xl font-bold text-slate-400 font-black uppercase tracking-widest">No Metric Data</h3>
                                            <p className="text-slate-400 mt-2 text-sm font-bold uppercase tracking-tight">The snapshot exists but contains no panel data records.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-end mb-4 px-4">
                                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-2xl shadow-sm">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isRegional ? 'bg-indigo-500' : 'bg-bank-teal'}`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                        {unitLabel}
                                                    </span>
                                                </div>
                                            </div>
                                            {categories.map(cat => (
                                                <MetricTable 
                                                    key={cat}
                                                    cat={cat}
                                                    items={snapshot.panelData.filter(p => p.parameter !== 'Branch_PL' && (p.metadata?.category || 'Uncategorized') === cat)}
                                                    snapshot={snapshot}
                                                    headerDates={headerDates}
                                                />
                                            ))}
                                        </>
                                    )}

                                    <IntelligenceHub intelligence={intelligence} />

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

                                    <ExceptionMatrix 
                                        show={showExceptions}
                                        onClose={() => setShowExceptions(false)}
                                        exceptions={snapshot.exceptions}
                                    />
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
