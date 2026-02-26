import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw, Table2, Trash2 } from 'lucide-react';
import api from '../../services/api';

const MISUpload: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string, details?: any } | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchHistory = React.useCallback(async () => {
        try {
            const res = await api.get('/mis/import-logs');
            setHistory(res.data);
        } catch (err) {
            console.error('Failed to fetch MIS history:', err);
        }
    }, []);

    React.useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setMessage(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setMessage(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/mis/excel-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.status === 200) {
                setMessage({
                    type: 'success',
                    text: `MIS Ingestion Complete: ${response.data.processedCount} units processed.`,
                    details: response.data
                });
                setFile(null);
                fetchHistory(); // Refresh history
            }
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Upload failed';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this MIS batch? This will remove all associated unit performance records.')) return;

        setDeletingId(id);
        try {
            await api.delete(`/mis/import-logs/${id}`);
            fetchHistory();
            setMessage({ type: 'success', text: 'Batch deleted successfully' });
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Delete failed';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pt-6 animate-in fade-in duration-500 pb-12">
            <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Table2 className="text-blue-600 w-8 h-8" />
                        MIS Data Inlet Journey
                    </h2>
                    <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-wider">Strategic Performance Ingestion Engine</p>
                </div>
                <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-4 py-2 rounded-full border border-slate-200">
                    <FileText size={14} />
                    <span>Supports: .xlsx (Pivot Format)</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className={`group relative card p-12 border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center space-y-4 ${file ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50'
                        }`}>
                        <div className={`p-5 rounded-3xl shadow-lg transition-transform duration-500 group-hover:scale-110 ${file ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-slate-100 text-slate-400 shadow-slate-100'
                            }`}>
                            <Upload size={36} />
                        </div>
                        <div className="text-center">
                            <p className="font-black text-slate-700 uppercase tracking-tight text-lg">
                                {file ? 'File Selected' : 'Drop MIS Excel File'}
                            </p>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                                {file ? file.name : 'Standard Bank Pivot Format (.xlsx)'}
                            </p>
                        </div>
                        <input
                            type="file"
                            accept=".xlsx"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />

                        {file && (
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="z-20 flex items-center gap-3 bg-blue-600 text-white px-8 py-3 rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all font-black uppercase tracking-widest shadow-xl shadow-blue-200 text-xs"
                            >
                                {uploading ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                                {uploading ? 'Ingesting Data...' : 'Start Inlet Journey'}
                            </button>
                        )}
                    </div>

                    {message && (
                        <div className={`p-6 rounded-2xl flex flex-col space-y-4 animate-in slide-in-from-bottom duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-100' : 'bg-red-50 text-red-800 border-2 border-red-100'
                            }`}>
                            <div className="flex items-center gap-3">
                                {message.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                                <span className="font-black text-sm uppercase tracking-tight">{message.text}</span>
                            </div>
                            {message.details && (
                                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-emerald-200/50">
                                    <div className="text-center">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60">Units</p>
                                        <p className="text-xl font-black">{message.details.uniqueUnits}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60">Records</p>
                                        <p className="text-xl font-black">{message.details.processedCount}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60">Failed</p>
                                        <p className="text-xl font-black">{message.details.failedCount}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <h3 className="font-black text-slate-800 pb-4 mb-4 border-b border-slate-50 uppercase tracking-tighter flex items-center gap-2">
                            Inlet History
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-50">
                                        <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Filename</th>
                                        <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Units</th>
                                        <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {history.map((h, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group/row">
                                            <td className="py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                                                {new Date(h.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-4">
                                                <p className="text-[12px] font-black text-slate-700">{h.filename}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{h.uniqueDates.join(', ')}</p>
                                            </td>
                                            <td className="py-4 text-center">
                                                <span className="text-[11px] font-black text-slate-600">{h.processedUnits}</span>
                                            </td>
                                            <td className="py-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${h.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {h.status}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(h.id)}
                                                    disabled={deletingId === h.id}
                                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
                                                    title="Delete Ingestion Data"
                                                >
                                                    {deletingId === h.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {history.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center">
                                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No previous journeys found</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <h3 className="font-black text-slate-800 border-b border-slate-50 pb-4 mb-4 uppercase tracking-tighter flex items-center gap-2">
                            Mapping Engine
                        </h3>
                        <div className="space-y-3">
                            {[
                                { h: 'SOL', m: 'Standardised 4-digit SOL' },
                                { h: 'DATE', m: 'YYYYMMDD Format' },
                                { h: 'Pivot Columns', m: 'Mudra, Agri_JL, SB, CD, etc.' },
                                { h: 'Auto-Snapshot', m: 'Generates daily panels' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{item.h}</p>
                                        <p className="text-[10px] text-slate-400 font-bold leading-tight">{item.m}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-800 rounded-3xl p-6 text-white shadow-xl shadow-slate-200">
                        <h3 className="font-black mb-4 uppercase tracking-widest text-xs text-blue-400">Security & Integrity</h3>
                        <p className="text-[10px] text-slate-300 font-medium leading-relaxed uppercase">
                            All uploads are standard across units. Existing data for the same SOL/Date will be updated. Ingestion logs are retained for audit.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MISUpload;
