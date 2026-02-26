import React, { useState, useEffect } from 'react';
import {
    Upload,
    FileText,
    CheckCircle,
    AlertCircle,
    History,
    Eye,
    ArrowRight,
    Search,
    Edit2,
    Trash2,
    Save,
    X,
    Database,
    ChevronLeft,
    ChevronRight,
    Filter
} from 'lucide-react';
import api from '../../services/api';

interface ImportLog {
    id: string;
    fileName: string;
    totalRows: number;
    processedRows: number;
    errors: number;
    importedBy: string;
    status: string;
    createdAt: string;
}

interface BudgetMaster {
    id: string;
    parameterName: string;
    solId: string;
    periodKey: string;
    targetValue: number;
    versionNo: number;
    updatedAt: string;
}

const BudgetUpload: React.FC = () => {
    // Upload & Preview State
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [logs, setLogs] = useState<ImportLog[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [previewData, setPreviewData] = useState<{ headers: string[], rows: any[] } | null>(null);
    const [csvContent, setCsvContent] = useState<string | null>(null);

    // Explorer State
    const [budgets, setBudgets] = useState<BudgetMaster[]>([]);
    const [loadingBudgets, setLoadingBudgets] = useState(false);
    const [filters, setFilters] = useState({ solId: '', parameterName: '' });
    const [parameters, setParameters] = useState<string[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    useEffect(() => {
        fetchLogs();
        fetchBudgets();
        fetchParameters();
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await api.get('/budget/logs');
            setLogs(res.data);
        } catch (err) {
            console.error('Failed to fetch logs', err);
        }
    };

    const fetchParameters = async () => {
        try {
            const res = await api.get('/budget/parameters');
            setParameters(res.data);
        } catch (err) {
            console.error('Failed to fetch parameters', err);
        }
    };

    const fetchBudgets = async () => {
        setLoadingBudgets(true);
        try {
            const params = new URLSearchParams();
            if (filters.solId) params.append('solId', filters.solId);
            if (filters.parameterName) params.append('parameterName', filters.parameterName);

            const res = await api.get(`/budget/master?${params.toString()}`);
            setBudgets(res.data);
        } catch (err) {
            console.error('Failed to fetch budgets', err);
        } finally {
            setLoadingBudgets(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewData(null);
            setCsvContent(null);
            setMessage(null);

            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                setCsvContent(content);
                generatePreview(content);
            };
            reader.readAsText(selectedFile);
        }
    };

    const generatePreview = (content: string) => {
        try {
            const lines = content.split('\n').filter(line => line.trim());
            if (lines.length === 0) return;

            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const rows = lines.slice(1, 11).map(line => {
                const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                const obj: any = {};
                headers.forEach((h, i) => {
                    obj[h] = values[i];
                });
                return obj;
            });

            setPreviewData({ headers, rows });
        } catch (err) {
            console.error('Preview failed', err);
        }
    };

    const handleUpload = async () => {
        if (!csvContent || !file) return;

        setUploading(true);
        setMessage(null);

        try {
            const response = await api.post('/budget/upload', {
                csvContent,
                fileName: file.name
            });

            if (response.status === 200) {
                setMessage({
                    type: 'success',
                    text: `Successfully processed ${response.data.results.processed} budget records.`
                });
                setFile(null);
                setPreviewData(null);
                setCsvContent(null);
                fetchLogs();
                fetchBudgets();
                fetchParameters();
            } else {
                setMessage({ type: 'error', text: response.data.error || 'Upload failed' });
            }
        } catch (err: any) {
            const errMsg = err.response?.data?.error || 'Network error during upload';
            setMessage({ type: 'error', text: errMsg });
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateBudget = async (id: string) => {
        try {
            await api.put(`/budget/master/${id}`, { targetValue: editValue });
            setEditingId(null);
            fetchBudgets();
        } catch (err) {
            alert('Failed to update budget');
        }
    };

    const handleDeleteBudget = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this budget record? This will be archived in history.')) return;
        try {
            await api.delete(`/budget/master/${id}`);
            fetchBudgets();
            fetchParameters();
        } catch (err) {
            alert('Failed to delete budget');
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pt-6 pb-20 px-4">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-bank-navy uppercase tracking-tight">Budget Management</h2>
                    <p className="text-gray-500 font-medium">Ingest and manage multi-period financial targets</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px] font-bold text-bank-navy/60 bg-bank-navy/5 border border-bank-navy/10 px-4 py-2 rounded-full uppercase tracking-widest">
                    <Database size={14} />
                    <span>SOL Standard: 4 Digits</span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-3 space-y-8">
                    {/* 1. Upload & Preview Region */}
                    <div className={`card overflow-hidden transition-all duration-500 ${!previewData ? 'p-4 border-gray-100' : 'p-6 bg-slate-50 border-bank-navy/10 shadow-xl shadow-bank-navy/5'}`}>
                        {!previewData ? (
                            <div className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center space-y-3 relative overflow-hidden group py-8 transition-colors hover:border-bank-teal/50 bg-white">
                                <div className="bg-bank-teal/10 p-3 rounded-xl text-bank-teal group-hover:scale-110 transition-transform duration-500 group-hover:bg-bank-teal group-hover:text-white">
                                    <Upload size={32} />
                                </div>
                                <div className="text-center group-hover:translate-y-[-2px] transition-transform duration-500">
                                    <p className="text-md font-black text-bank-navy uppercase tracking-tight">Drop Budget CSV Here</p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">Wide-format monthly columns (MMM-YY)</p>
                                </div>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="mt-2 flex gap-2">
                                    <span className="px-2 py-0.5 bg-gray-50 text-[9px] font-black text-gray-400 border border-gray-100 rounded-full uppercase tracking-widest">CSV Only</span>
                                    <span className="px-2 py-0.5 bg-gray-50 text-[9px] font-black text-gray-400 border border-gray-100 rounded-full uppercase tracking-widest">Max 15MB</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center space-x-4">
                                        <div className="p-3 bg-bank-navy text-white rounded-xl shadow-lg shadow-bank-navy/20">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <p className="text-md font-black text-bank-navy uppercase tracking-tight">{file?.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="w-2 h-2 bg-bank-teal rounded-full animate-pulse"></span>
                                                <p className="text-[10px] text-bank-teal font-black uppercase tracking-widest">Parsed & Ready for Ingestion</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setFile(null); setPreviewData(null); }}
                                        className="text-[11px] font-black text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-all border border-red-100 uppercase tracking-widest hover:scale-105 active:scale-95"
                                    >
                                        Change File
                                    </button>
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xl shadow-bank-navy/5">
                                    <div className="bg-gray-50/80 backdrop-blur-sm px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Eye size={16} className="text-bank-navy/40" />
                                            <span className="text-[11px] font-black text-bank-navy/60 uppercase tracking-widest">Ingestion Preview</span>
                                        </div>
                                        <span className="text-[11px] font-black text-gray-400">{csvContent?.split('\n').filter(l => l.trim()).length || 0} Total Rows Detected</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead className="bg-gray-50/50">
                                                <tr>
                                                    {previewData.headers.map(h => (
                                                        <th key={h} className="px-5 py-3 font-black text-bank-navy/40 border-b border-gray-100 whitespace-nowrap uppercase tracking-tighter">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {previewData.rows.map((row, i) => (
                                                    <tr key={i} className="hover:bg-bank-teal/5 transition-colors group">
                                                        {previewData.headers.map(h => (
                                                            <td key={h} className="px-5 py-3 text-gray-600 whitespace-nowrap font-bold">
                                                                {h === 'SOL' ? (
                                                                    <span className="bg-bank-navy/5 px-2 py-1 rounded-md text-bank-navy group-hover:bg-bank-navy group-hover:text-white transition-colors">{row[h]}</span>
                                                                ) : row[h]}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={handleUpload}
                                        disabled={uploading}
                                        className={`flex-1 py-5 rounded-2xl font-black text-white transition-all shadow-2xl flex items-center justify-center space-x-3 uppercase tracking-widest ${uploading ? 'bg-gray-300 cursor-not-allowed shadow-none scale-100' : 'bg-bank-teal hover:bg-bank-teal/90 hover:scale-[1.02] active:scale-95 shadow-bank-teal/30'
                                            }`}
                                    >
                                        {uploading ? (
                                            <>
                                                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Processing Batch...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={22} sx={{ strokeWidth: 3 }} />
                                                <span>Finalize Ingestion</span>
                                                <ArrowRight size={20} className="opacity-50" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {message && (
                        <div className={`p-5 rounded-2xl flex items-start space-x-4 animate-in fade-in zoom-in duration-300 border-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                            <div className={`p-2 rounded-full ${message.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                                {message.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                            </div>
                            <div>
                                <p className="font-black uppercase tracking-tight text-lg">{message.text}</p>
                                <p className="text-xs opacity-75 mt-0.5 font-bold uppercase tracking-widest">
                                    {message.type === 'success' ? 'Database updated. Refreshing Explorer...' : 'Check file format or network connectivity.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* 2. Budget Explorer Region */}
                    <div className="card p-0 overflow-hidden border-gray-100 shadow-xl shadow-bank-navy/5">
                        <div className="p-6 bg-white border-b border-gray-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-bank-navy text-white rounded-lg">
                                        <Database size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-bank-navy uppercase tracking-tight">Active Budget Explorer</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Query and manage master targets • Sorted by SOL & Period</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { fetchBudgets(); fetchParameters(); }}
                                        className="p-2 hover:bg-gray-100 rounded-full text-bank-navy transition-colors"
                                        title="Refresh Data"
                                    >
                                        <History size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[200px] relative">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <select
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-bank-teal/30 focus:bg-white transition-all outline-none appearance-none"
                                        value={filters.parameterName}
                                        onChange={e => {
                                            const newVal = e.target.value;
                                            setFilters(prev => ({ ...prev, parameterName: newVal }));
                                        }}
                                    >
                                        <option value="">All Parameters / Select To Filter...</option>
                                        {parameters.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-[150px] relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="SOL ID..."
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-bank-teal/30 focus:bg-white transition-all outline-none"
                                        value={filters.solId}
                                        onChange={e => setFilters({ ...filters, solId: e.target.value })}
                                        onKeyUp={e => e.key === 'Enter' && fetchBudgets()}
                                    />
                                </div>
                                <button
                                    onClick={fetchBudgets}
                                    className="px-6 py-2 bg-bank-navy text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-lg shadow-bank-navy/10"
                                >
                                    Filter View
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto min-h-[400px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">SOL</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Period</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Parameter</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Target Value</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loadingBudgets ? (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-8 h-8 border-2 border-bank-teal border-t-transparent rounded-full animate-spin"></div>
                                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Syncing Records...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : budgets.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center text-gray-400 font-bold italic text-sm uppercase tracking-widest">
                                                No matching records in master.
                                            </td>
                                        </tr>
                                    ) : budgets.map(b => (
                                        <tr key={b.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="bg-bank-navy/5 px-2 py-1 rounded-md text-[11px] font-black text-bank-navy border border-gray-200 group-hover:bg-bank-navy group-hover:text-white transition-colors">
                                                    {b.solId}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 text-[11px] font-black text-bank-teal bg-bank-teal/5 rounded-md uppercase border border-bank-teal/10">
                                                    {b.periodKey}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-black text-bank-navy text-sm uppercase tracking-tighter">{b.parameterName}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">v{b.versionNo} • Last Mod: {new Date(b.updatedAt).toLocaleDateString()}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {editingId === b.id ? (
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        className="w-[140px] px-2 py-1 text-right text-xs font-black text-bank-teal border-2 border-bank-teal rounded-lg focus:outline-none"
                                                        onKeyUp={e => e.key === 'Enter' && handleUpdateBudget(b.id)}
                                                    />
                                                ) : (
                                                    <p className="font-black text-bank-navy text-sm tracking-tight text-right">₹{b.targetValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {editingId === b.id ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleUpdateBudget(b.id)}
                                                                className="p-1.5 text-white bg-bank-teal rounded-lg hover:bg-bank-teal/80 transition-colors"
                                                            >
                                                                <Save size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingId(null)}
                                                                className="p-1.5 text-gray-400 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => { setEditingId(b.id); setEditValue(b.targetValue.toString()); }}
                                                                className="p-1.5 text-bank-navy bg-bank-navy/5 rounded-lg hover:bg-bank-navy hover:text-white transition-all shadow-sm"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteBudget(b.id)}
                                                                className="p-1.5 text-red-500 bg-red-50 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Limit: First 1000 matched records</p>
                            <div className="flex items-center gap-2">
                                <button disabled className="p-2 text-gray-300 cursor-not-allowed"><ChevronLeft size={16} /></button>
                                <span className="text-xs font-black text-bank-navy">PAGE 01</span>
                                <button disabled className="p-2 text-gray-300 cursor-not-allowed"><ChevronRight size={16} /></button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    {/* Rules Card */}
                    <div className="card p-6 border-amber-100 bg-amber-50/20 shadow-xl shadow-amber-900/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full animate-pulse"></div>
                        <h3 className="font-black text-amber-800 border-b border-amber-100 pb-3 mb-4 flex items-center gap-2 uppercase tracking-tighter text-sm">
                            <AlertCircle size={18} className="text-amber-500" />
                            Ingestion Guards
                        </h3>
                        <ul className="text-[11px] text-amber-900/60 space-y-4 font-bold">
                            <li className="flex gap-3 leading-relaxed">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></span>
                                <span>SOL IDs are normalized to <strong>4 digits</strong> (e.g. 174 → 0174) for system consistency.</span>
                            </li>
                            <li className="flex gap-3 leading-relaxed">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></span>
                                <span>Period matching requires header format <strong className="text-amber-700">MMM-YY</strong> (e.g. MAR-26).</span>
                            </li>
                            <li className="flex gap-3 leading-relaxed">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></span>
                                <span>New Parameters are <strong>auto-registered</strong>. Existing ones are versioned.</span>
                            </li>
                        </ul>
                    </div>

                    {/* History Logs */}
                    <div className="card p-0 overflow-hidden shadow-xl shadow-bank-navy/5">
                        <h3 className="p-5 font-black text-bank-navy border-b border-gray-100 flex items-center gap-2 uppercase tracking-tight text-sm">
                            <History size={18} className="text-bank-teal" />
                            Ingestion Audit
                        </h3>
                        <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {logs.length === 0 ? (
                                <div className="py-12 text-center">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <History size={24} className="text-gray-200" />
                                    </div>
                                    <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest italic">No batch history</p>
                                </div>
                            ) : logs.map(log => (
                                <div key={log.id} className="p-4 bg-white rounded-2xl border border-gray-50 hover:border-bank-teal/30 hover:shadow-md transition-all group cursor-default">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="truncate pr-2">
                                            <p className="text-[10px] font-black text-bank-navy uppercase truncate group-hover:text-bank-teal transition-colors tracking-tight">{log.fileName}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(log.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-sm ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {log.status === 'SUCCESS' ? 'Pass' : 'Fail'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-black text-bank-navy">{log.processedRows}</span>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Entries Ingested</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-gray-50/50 border-t border-gray-100 text-center">
                            <button className="text-[10px] font-black text-bank-navy/40 hover:text-bank-navy uppercase tracking-widest transition-colors">View All Logs</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BudgetUpload;
