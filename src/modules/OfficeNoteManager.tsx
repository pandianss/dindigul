import React, { useState, useEffect } from 'react';
import { FileText, Plus, Clock, User, Download, Eye, Building2, IndianRupee, LayoutDashboard } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';

interface OfficeNote {
    id: string;
    type: string;
    status: string;
    titleEn: string;
    contentJson: string;
    preparer: { fullNameEn: string, username: string };
    createdAt: string;
}

const OfficeNoteManager: React.FC = () => {
    const [notes, setNotes] = useState<OfficeNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        type: 'CUSTOM',
        titleEn: '',
        titleTa: '',
        titleHi: '',
        contentJson: {
            details: '',
            amount: '',
            branch: '',
            justification: '',
            reference: ''
        }
    });

    const fetchNotes = () => {
        setLoading(true);
        api.get('/office-notes')
            .then(res => {
                setNotes(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching notes:', err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            await api.post('/office-notes', {
                ...formData,
                preparerId: user.id || 'admin'
            });
            setShowForm(false);
            setFormData({
                type: 'CUSTOM',
                titleEn: '',
                titleTa: '',
                titleHi: '',
                contentJson: { details: '', amount: '', branch: '', justification: '', reference: '' }
            });
            fetchNotes();
        } catch (error) {
            console.error('Error creating note:', error);
        }
    };

    const handleDownloadPDF = async (id: string, title: string) => {
        try {
            const response = await api.get(`/office-notes/${id}/pdf`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `OfficeNote_${title.replace(/\s+/g, '_')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to generate PDF. Is the background server running?');
        }
    };

    return (
        <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold text-bank-navy tracking-tight">Office Note Generator</h2>
                    <p className="text-gray-500 font-medium mt-1">Full-blown vector document generation for Regional Office use cases</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${showForm ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-bank-teal text-white hover:bg-opacity-90 active:scale-95'
                        }`}
                >
                    {showForm ? <Plus className="rotate-45 transition-transform" /> : <Plus />}
                    <span>{showForm ? 'Discard Draft' : 'Initiate New Note'}</span>
                </button>
            </div>

            {showForm && (
                <div className="card p-10 bg-white border border-bank-teal/20 shadow-2xl rounded-2xl animate-in slide-in-from-top duration-500">
                    <div className="flex items-center space-x-3 mb-8 border-b pb-4">
                        <div className="p-3 bg-bank-navy text-white rounded-xl shadow-inner">
                            <LayoutDashboard size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-bank-navy">Document Initiation Form</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Master Template: Trilingual Vector PDF</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Note Type</label>
                                <select
                                    className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy font-bold bg-gray-50/50"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="CUSTOM">Custom Office Note</option>
                                    <option value="DD_AUTHORIZATION">Demand Draft Authorization</option>
                                    <option value="GL_HEAD_ACTIVATION">GL Head Activation</option>
                                    <option value="VISIT_REPORT">Executive Visit Report</option>
                                    <option value="BROKEN_INTEREST">Broken Period Interest</option>
                                </select>
                            </div>
                            <div className="md:col-span-2 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Subject (English)</label>
                                    <input
                                        type="text" required
                                        className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all"
                                        placeholder="Clear, concise subject heading"
                                        value={formData.titleEn}
                                        onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 font-tamil">பொருள் (Tamil)</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all font-tamil text-sm"
                                            placeholder="தமிழில் பொருள்"
                                            value={formData.titleTa}
                                            onChange={(e) => setFormData({ ...formData, titleTa: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 font-hindi">विषय (Hindi)</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all font-hindi text-sm"
                                            placeholder="हिंदी में विषय"
                                            value={formData.titleHi}
                                            onChange={(e) => setFormData({ ...formData, titleHi: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
                            <div>
                                <label className="flex items-center space-x-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                    <IndianRupee size={14} className="text-bank-teal" />
                                    <span>Financial Amount (₹)</span>
                                </label>
                                <input
                                    type="number"
                                    className="w-full px-5 py-3 border-2 border-white rounded-xl outline-none focus:border-bank-teal transition-all shadow-sm"
                                    placeholder="Enter amount if applicable"
                                    value={formData.contentJson.amount}
                                    onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, amount: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="flex items-center space-x-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                    <Building2 size={14} className="text-bank-teal" />
                                    <span>Unit / Branch Name</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3 border-2 border-white rounded-xl outline-none focus:border-bank-teal transition-all shadow-sm"
                                    placeholder="Target Branch/Office"
                                    value={formData.contentJson.branch}
                                    onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, branch: e.target.value } })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Detailed Narrative / Proposal</label>
                            <textarea
                                rows={6} required
                                className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all leading-relaxed"
                                placeholder="Structure your note clearly with background, facts, and recommendation..."
                                value={formData.contentJson.details}
                                onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, details: e.target.value } })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Justification & Policy Reference</label>
                            <input
                                type="text"
                                className="w-full px-5 py-3 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all"
                                placeholder="Circular reference or specific policy quote"
                                value={formData.contentJson.justification}
                                onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, justification: e.target.value } })}
                            />
                        </div>

                        <div className="flex justify-end pt-6 border-t">
                            <button
                                type="submit"
                                className="bg-bank-navy text-white px-12 py-4 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all flex items-center space-x-3"
                            >
                                <FileText size={20} />
                                <span>Commit & Generate Vector PDF</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-bank-teal"></div>
                    <p className="text-gray-400 font-bold animate-pulse">Establishing secure document connection...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {notes.length > 0 ? (
                        notes.map((note: OfficeNote) => (
                            <div key={note.id} className="group card p-8 bg-white hover:border-bank-teal shadow-sm hover:shadow-xl transition-all border-2 border-transparent relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-full -mr-16 -mt-16 group-hover:bg-bank-teal/5 transition-colors"></div>

                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center space-x-6">
                                        <div className="p-4 rounded-2xl bg-bank-navy/5 text-bank-navy group-hover:bg-bank-navy group-hover:text-white transition-all">
                                            <FileText size={32} />
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-3">
                                                <h3 className="text-xl font-bold text-bank-navy">{note.titleEn}</h3>
                                                <span className="bg-bank-teal/10 text-bank-teal text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm border border-bank-teal/20">
                                                    {note.type.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-4 text-sm text-gray-400 font-medium mt-2">
                                                <span className="flex items-center space-x-1.5"><User size={14} className="text-bank-teal" /> <span>{note.preparer?.fullNameEn || 'System Admin'}</span></span>
                                                <span className="text-gray-200">|</span>
                                                <span className="flex items-center space-x-1.5"><Clock size={14} className="text-bank-teal" /> <span>{format(new Date(note.createdAt), 'do MMMM yyyy, HH:mm')}</span></span>
                                                <span className="text-gray-200">|</span>
                                                <span className="font-mono text-[10px] text-gray-300">REF: RO/${note.id.slice(0, 8).toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={() => handleDownloadPDF(note.id, note.titleEn)}
                                            className="flex items-center space-x-2 bg-white text-bank-teal border-2 border-bank-teal px-5 py-2.5 rounded-xl font-bold hover:bg-bank-teal hover:text-white transition-all shadow-md active:scale-95"
                                        >
                                            <Download size={18} />
                                            <span>Vector PDF</span>
                                        </button>
                                        <button className="p-3 text-gray-300 hover:text-bank-navy hover:bg-gray-100 rounded-xl transition-all">
                                            <Eye size={24} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-24 card border-dashed border-4 border-gray-100 bg-gray-50/50 rounded-3xl">
                            <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-2 border-gray-100">
                                <FileText className="text-gray-300" size={48} />
                            </div>
                            <h4 className="text-2xl font-bold text-gray-500">Regional Document Vault Empty</h4>
                            <p className="text-gray-400 max-w-sm mx-auto mt-2">The system is ready to generate official trilingual vector correspondence. Initiate your first office note above.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OfficeNoteManager;
