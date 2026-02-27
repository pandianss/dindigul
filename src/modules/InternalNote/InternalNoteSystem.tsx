import React, { useState, useEffect } from 'react';
import { FileText, Send, Eye, Download, Search, Layout, ArrowLeft, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/handleError';

interface InternalNote {
    id: string;
    refNo: string;
    department: string;
    subject: string;
    classification: string;
    createdBy: string;
    fileUrl: string;
    createdAt: string;
}

interface Department {
    id: string;
    code: string;
    nameEn: string;
    nameTa?: string;
    nameHi?: string;
}

const InternalNoteSystem: React.FC = () => {
    const { t } = useTranslation();
    const [notes, setNotes] = useState<InternalNote[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'LIST' | 'FORM' | 'PREVIEW'>('LIST');
    const [selectedNote, setSelectedNote] = useState<InternalNote | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        refNo: '',
        department: '',
        departmentTa: '',
        departmentHi: '',
        subject: '',
        classification: 'INTERNAL',
        bodyHtml: ''
    });

    useEffect(() => {
        if (selectedNote && view === 'PREVIEW') {
            const fetchPreview = async () => {
                try {
                    const response = await api.get(`/internal-notes/${selectedNote.id}/pdf`, {
                        responseType: 'blob'
                    });
                    const url = URL.createObjectURL(response.data);
                    console.log('[InternalNoteSystem] Generated Blob URL:', url);
                    setPreviewUrl(url);
                } catch (err) {
                    console.error('Failed to fetch PDF preview:', err);
                }
            };
            fetchPreview();
        } else {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
            }
        }
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [selectedNote, view]);

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const res = await api.get('/internal-notes');
            setNotes(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments');
            setDepartments(res.data);
            // Auto-select first department if available and not set
            if (res.data.length > 0 && !formData.department) {
                const d = res.data[0];
                setFormData(prev => ({
                    ...prev,
                    department: d.nameEn,
                    departmentTa: d.nameTa || '',
                    departmentHi: d.nameHi || ''
                }));
            }
        } catch (err) {
            console.error('Failed to fetch departments:', err);
        }
    };

    useEffect(() => {
        fetchNotes();
        fetchDepartments();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/internal-notes', formData);
            setSelectedNote(res.data);
            setView('PREVIEW');
            fetchNotes();
        } catch (err: any) {
            const errorMsg = err.response?.data?.details || err.response?.data?.error || getErrorMessage(err);
            alert(`Error: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (id: string) => {
        try {
            const response = await api.get(`/internal-notes/${id}/pdf`, {
                responseType: 'blob'
            });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `internal_note_${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed:', err);
            alert('Failed to download PDF');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/30 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-bank-navy tracking-tight">Internal Letterhead System</h1>
                        <p className="text-gray-500 font-medium">Official Vector Correspondence Engine</p>
                    </div>
                    {view === 'LIST' ? (
                        <button
                            onClick={() => setView('FORM')}
                            className="bg-bank-navy text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-opacity-90 transition-all shadow-lg active:scale-95"
                        >
                            <FileText size={20} />
                            <span>Create New Note</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setView('LIST')}
                            className="text-gray-500 font-bold flex items-center space-x-2 hover:text-bank-navy transition-all"
                        >
                            <ArrowLeft size={20} />
                            <span>Back to Vault</span>
                        </button>
                    )}
                </div>

                {view === 'LIST' && (
                    <div className="space-y-4">
                        {loading && notes.length === 0 ? (
                            <div className="py-20 text-center">
                                <RefreshCw className="animate-spin mx-auto text-bank-teal mb-4" size={40} />
                                <p className="text-gray-400 font-bold">Synchronizing Document Vault...</p>
                            </div>
                        ) : notes.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {notes.map(note => (
                                    <div key={note.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                                <FileText size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-bank-navy">{note.subject}</h3>
                                                <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
                                                    <span className="font-mono text-blue-500">{note.refNo}</span>
                                                    <span>•</span>
                                                    <span>{note.department}</span>
                                                    <span>•</span>
                                                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => { setSelectedNote(note); setView('PREVIEW'); }}
                                                className="p-2 text-gray-400 hover:text-bank-teal hover:bg-bank-teal/10 rounded-lg transition-all"
                                                title="Preview"
                                            >
                                                <Eye size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleDownload(note.id)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Download PDF"
                                            >
                                                <Download size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center border-4 border-dashed border-gray-100 rounded-3xl">
                                <Search className="mx-auto text-gray-200 mb-4" size={60} />
                                <h3 className="text-xl font-bold text-gray-400">Vault is empty</h3>
                                <p className="text-gray-300">Generate your first official correspondence above.</p>
                            </div>
                        )}
                    </div>
                )}

                {view === 'FORM' && (
                    <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-2xl animate-in slide-in-from-bottom duration-500">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Reference Number</label>
                                    <input
                                        type="text" required
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-bank-teal rounded-2xl outline-none transition-all font-bold"
                                        placeholder="e.g. RO/DGL/ADMIN/2026/01"
                                        value={formData.refNo}
                                        onChange={e => setFormData({ ...formData, refNo: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Department</label>
                                    <select
                                        required
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-bank-teal rounded-2xl outline-none transition-all font-bold appearance-none cursor-pointer"
                                        value={formData.department}
                                        onChange={e => {
                                            const dept = departments.find(d => d.nameEn === e.target.value);
                                            if (dept) {
                                                setFormData({
                                                    ...formData,
                                                    department: dept.nameEn,
                                                    departmentTa: dept.nameTa || '',
                                                    departmentHi: dept.nameHi || ''
                                                });
                                            }
                                        }}
                                    >
                                        <option value="" disabled>Select Department</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.nameEn}>
                                                {dept.nameEn} {dept.nameTa ? `| ${dept.nameTa}` : ''} {dept.nameHi ? `| ${dept.nameHi}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Subject</label>
                                    <input
                                        type="text" required
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-bank-teal rounded-2xl outline-none transition-all font-bold"
                                        placeholder="Enter subject heading (English/Tamil/Hindi)"
                                        value={formData.subject}
                                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Classification</label>
                                    <select
                                        required
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-bank-teal rounded-2xl outline-none transition-all font-bold appearance-none cursor-pointer"
                                        value={formData.classification}
                                        onChange={e => setFormData({ ...formData, classification: e.target.value })}
                                    >
                                        <option value="INTERNAL">{t('classification.INTERNAL')}</option>
                                        <option value="CONFIDENTIAL">{t('classification.CONFIDENTIAL')}</option>
                                        <option value="SECRET">{t('classification.SECRET')}</option>
                                        <option value="HIGHLY CONFIDENTIAL">{t('classification.HIGHLY CONFIDENTIAL')}</option>
                                        <option value="PRIVATE">{t('classification.PRIVATE')}</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Content (HTML Supported)</label>
                                <textarea
                                    required rows={12}
                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-bank-teal rounded-2xl outline-none transition-all leading-relaxed"
                                    placeholder="Compose your note here..."
                                    value={formData.bodyHtml}
                                    onChange={e => setFormData({ ...formData, bodyHtml: e.target.value })}
                                />
                                <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest italic flex items-center space-x-1">
                                    <Layout size={10} />
                                    <span>Trilingual input and basic HTML formatting supported</span>
                                </p>
                            </div>

                            <div className="flex justify-end pt-6 border-t">
                                <button
                                    type="submit" disabled={loading}
                                    className="bg-bank-teal text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all flex items-center space-x-3 disabled:opacity-50"
                                >
                                    {loading ? <RefreshCw className="animate-spin" /> : <Send size={20} />}
                                    <span>Generate Official Letterhead</span>
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {view === 'PREVIEW' && selectedNote && (
                    <div className="bg-white overflow-hidden rounded-3xl border border-gray-100 shadow-2xl flex flex-col h-[80vh] animate-in zoom-in-95 duration-300">
                        <div className="p-4 bg-gray-50 border-bottom flex items-center justify-between">
                            <h3 className="font-bold text-bank-navy flex items-center space-x-2">
                                <Eye className="text-bank-teal" size={18} />
                                <span>Document Preview: {selectedNote.subject}</span>
                            </h3>
                            <button
                                onClick={() => handleDownload(selectedNote.id)}
                                className="bg-bank-navy text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2 shadow-lg"
                            >
                                <Download size={16} />
                                <span>Download Oficial PDF</span>
                            </button>
                        </div>
                        <div className="flex-1 bg-gray-400/20 p-8">
                            {previewUrl ? (
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-full rounded-lg shadow-2xl bg-white"
                                    title="PDF Preview"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-white rounded-lg shadow-2xl">
                                    <div className="text-center">
                                        <RefreshCw className="animate-spin mx-auto text-bank-teal mb-4" size={40} />
                                        <p className="text-gray-400 font-bold">Loading Secure Document Preview...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InternalNoteSystem;
