import React, { useState, useEffect } from 'react';
import {
    Database,
    Edit2,
    Save,
    X,
    Search,
    Filter,
    ChevronRight,
    ChevronDown,
    CheckCircle,
    AlertCircle,
    Layers,
    Type,
    Link2,
    ArrowRight,
    Trash2
} from 'lucide-react';
import api from '../../services/api';

interface MisParameter {
    parameterName: string;
    displayName: string;
    fullForm: string | null;
    description: string | null;
    category: string | null;
    isEnabled: boolean;
    orderIndex: number;
    parentParameterName: string | null;
    budgetCount?: number;
    parentParameter?: {
        parameterName: string;
        displayName: string;
    } | null;
}

const ParameterManager: React.FC = () => {
    const [parameters, setParameters] = useState<MisParameter[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');
    const [editData, setEditData] = useState<Partial<MisParameter>>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchParameters();
    }, []);

    const fetchParameters = async () => {
        setLoading(true);
        try {
            const res = await api.get('/parameters');
            setParameters(res.data);
        } catch (err) {
            console.error('Failed to fetch parameters', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (parameterName: string) => {
        try {
            await api.put(`/parameters/${parameterName}`, editData);
            setEditingId(null);
            setMessage({ type: 'success', text: `Parameter '${parameterName}' updated successfully.` });
            fetchParameters();
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Update failed';
            setMessage({ type: 'error', text: errorMsg });
        }
    };

    const handleDelete = async (parameterName: string, force = false) => {
        const confirmMsg = force
            ? `CRITICAL WARNING: This will permanently PURGE '${parameterName}' AND ALL ${parameters.find(p => p.parameterName === parameterName)?.budgetCount} associated budget records. This cannot be undone. Type 'DELETE' to confirm:`
            : `Are you sure you want to remove '${parameterName}' from the registry?`;

        if (force) {
            const verification = window.prompt(confirmMsg);
            if (verification !== 'DELETE') return;
        } else {
            if (!window.confirm(confirmMsg)) return;
        }

        try {
            await api.delete(`/parameters/${encodeURIComponent(parameterName)}${force ? '?force=true' : ''}`);
            setMessage({ type: 'success', text: force ? `Parameter and all linked data purged successfully.` : `Parameter removed successfully.` });
            fetchParameters();
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Delete failed';
            setMessage({ type: 'error', text: errorMsg });
        }
    };

    const filteredParams = parameters.filter(p =>
        p.parameterName.toLowerCase().includes(search.toLowerCase()) ||
        p.displayName.toLowerCase().includes(search.toLowerCase()) ||
        (p.fullForm?.toLowerCase().includes(search.toLowerCase())) ||
        (p.category?.toLowerCase().includes(search.toLowerCase()))
    );

    const categories = Array.from(new Set(parameters.map(p => p.category || 'Uncategorized'))).sort();

    const renderParameterCard = (p: MisParameter) => (
        <div key={p.parameterName} className={`card p-0 overflow-hidden transition-all duration-300 border-gray-100 shadow-md ${editingId === p.parameterName ? 'ring-2 ring-bank-teal border-transparent shadow-bank-teal/10' : 'hover:shadow-xl hover:shadow-bank-navy/5'}`}>
            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-50">
                {/* Identity Block */}
                <div className="p-5 md:w-1/4 bg-gray-50/50">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Code</span>
                        {p.parentParameterName && (
                            <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase">Sub-Param</span>
                        )}
                    </div>
                    <p className="text-xl font-black text-bank-navy uppercase tracking-tighter mb-2">{p.parameterName}</p>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-black text-bank-teal uppercase tracking-widest flex items-center gap-1">
                            <Filter size={10} />
                            {p.category || 'NO GROUP'}
                        </span>
                    </div>
                </div>

                {/* Content Block */}
                <div className="p-5 flex-1 space-y-4">
                    {editingId === p.parameterName ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    <Type size={12} /> Display Name
                                </label>
                                <input
                                    className="w-full p-2 bg-white border-2 border-bank-teal/20 rounded-xl text-sm font-bold focus:border-bank-teal outline-none"
                                    value={editData.displayName || ''}
                                    onChange={e => setEditData({ ...editData, displayName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    <Database size={12} /> Full Form
                                </label>
                                <input
                                    className="w-full p-2 bg-white border-2 border-bank-teal/20 rounded-xl text-sm font-bold focus:border-bank-teal outline-none"
                                    value={editData.fullForm || ''}
                                    onChange={e => setEditData({ ...editData, fullForm: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    <Layers size={12} /> Category
                                </label>
                                <select
                                    className="w-full p-2 bg-white border-2 border-bank-teal/20 rounded-xl text-sm font-bold focus:border-bank-teal outline-none"
                                    value={editData.category || ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === 'NEW') {
                                            const name = window.prompt('Enter new category name:');
                                            if (name) setEditData({ ...editData, category: name.trim() });
                                        } else {
                                            setEditData({ ...editData, category: val });
                                        }
                                    }}
                                >
                                    <option value="">Uncategorized</option>
                                    {categories.filter(c => c !== 'Uncategorized').map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                    {/* Show the new category if it hasn't been saved yet */}
                                    {editData.category && !categories.includes(editData.category) && (
                                        <option value={editData.category}>{editData.category} (New)</option>
                                    )}
                                    <option value="NEW">+ Create New ...</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    <Link2 size={12} /> Parent
                                </label>
                                <select
                                    className="w-full p-2 bg-white border-2 border-bank-teal/20 rounded-xl text-sm font-bold focus:border-bank-teal outline-none"
                                    value={editData.parentParameterName || ''}
                                    onChange={e => setEditData({ ...editData, parentParameterName: e.target.value })}
                                >
                                    <option value="">No Parent</option>
                                    {parameters.filter(cand => cand.parameterName !== p.parameterName).map(cand => (
                                        <option key={cand.parameterName} value={cand.parameterName}>{cand.displayName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="flex-1 w-full space-y-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-lg font-black text-bank-navy uppercase tracking-tight">{p.displayName}</p>
                                    <ArrowRight size={14} className="text-gray-300" />
                                    <p className="text-sm font-bold text-bank-teal uppercase tracking-widest">{p.fullForm || 'NO FULL FORM'}</p>
                                </div>
                                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{p.description || 'No description provided.'}</p>
                            </div>
                            {p.parentParameter && (
                                <div className="bg-amber-50 px-3 py-2 rounded-xl border border-amber-100 flex items-center gap-2 min-w-[150px]">
                                    <Link2 size={14} className="text-amber-500" />
                                    <div>
                                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Child Of</p>
                                        <p className="text-[11px] font-black text-bank-navy uppercase">{p.parentParameter.displayName}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions Block */}
                <div className="p-5 md:w-44 flex items-center justify-center bg-gray-50/20">
                    {editingId === p.parameterName ? (
                        <div className="flex gap-2">
                            <button onClick={() => handleSave(p.parameterName)} className="p-3 bg-bank-teal text-white rounded-2xl shadow-lg shadow-bank-teal/20"><Save size={20} /></button>
                            <button onClick={() => setEditingId(null)} className="p-3 bg-white text-red-500 border border-red-100 rounded-2xl"><X size={20} /></button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 w-full">
                            <button
                                onClick={() => {
                                    setEditingId(p.parameterName);
                                    setEditData({ ...p });
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-bank-navy text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                            >
                                <Edit2 size={12} /> Configure
                            </button>

                            <div className="flex flex-col items-center gap-1">
                                {((p.budgetCount || 0) > 0) ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <button
                                            onClick={() => handleDelete(p.parameterName, true)}
                                            className="flex items-center justify-center gap-1 font-black text-[9px] uppercase tracking-widest text-amber-600 hover:text-red-600 transition-all border border-amber-200 bg-amber-50 px-3 py-1 rounded-lg"
                                        >
                                            <Trash2 size={10} /> Force Purge
                                        </button>
                                        <span className="text-[8px] font-bold text-gray-400 underline decoration-amber-500/30 uppercase tracking-tight">
                                            Linked to {p.budgetCount} records
                                        </span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleDelete(p.parameterName, false)}
                                        className="flex items-center justify-center gap-1 font-black text-[9px] uppercase tracking-widest text-red-500 hover:text-red-700 transition-all"
                                    >
                                        <Trash2 size={10} /> Delete Entry
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-bank-navy uppercase tracking-tight">Parameter Registry</h2>
                    <p className="text-gray-500 font-medium">Group metrics and define metadata</p>
                </div>
                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
                    <button
                        onClick={() => setViewMode('flat')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'flat' ? 'bg-white text-bank-navy shadow-sm' : 'text-gray-400'}`}
                    >
                        Flat List
                    </button>
                    <button
                        onClick={() => setViewMode('grouped')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'grouped' ? 'bg-white text-bank-navy shadow-sm' : 'text-gray-400'}`}
                    >
                        Grouped View
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Search parameters..."
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold shadow-xl shadow-bank-navy/5 focus:ring-2 focus:ring-bank-teal/20 transition-all outline-none"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 border ${message.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span className="text-xs font-black uppercase tracking-tight">{message.text}</span>
                </div>
            )}

            {/* List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="py-20 text-center text-gray-400 uppercase font-black text-[10px] tracking-widest animate-pulse">Syncing...</div>
                ) : filteredParams.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 italic">No parameters match your search.</div>
                ) : viewMode === 'flat' ? (
                    <div className="grid grid-cols-1 gap-4">{filteredParams.map(p => renderParameterCard(p))}</div>
                ) : (
                    <div className="space-y-12">
                        {categories.map(cat => {
                            const items = filteredParams.filter(p => (p.category || 'Uncategorized') === cat);
                            if (items.length === 0) return null;
                            return (
                                <div key={cat} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center gap-4 mb-6 group">
                                        <div className="p-3 bg-bank-navy text-white rounded-2xl shadow-lg shadow-bank-navy/10 group-hover:scale-110 transition-transform duration-300">
                                            <Layers size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-bank-navy uppercase tracking-widest">{cat}</h3>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{items.length} Registered Metrics</p>
                                        </div>
                                        <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent ml-2"></div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 pl-4 border-l-2 border-gray-50 ml-6">
                                        {items.map(p => renderParameterCard(p))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ParameterManager;
