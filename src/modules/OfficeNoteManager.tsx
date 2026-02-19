import React, { useState, useEffect } from 'react';
import { FileText, Plus, CheckCircle, XCircle, Clock, User, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface OfficeNote {
    id: string;
    type: string;
    status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
    titleEn: string;
    contentJson: string;
    preparer: { fullNameEn: string };
    approver?: { fullNameEn: string };
    createdAt: string;
}

const OfficeNoteManager: React.FC = () => {
    const [notes, setNotes] = useState<OfficeNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        type: 'DD_AUTHORIZATION',
        titleEn: '',
        contentJson: {
            details: '',
            amount: '',
            branch: ''
        }
    });

    const fetchNotes = () => {
        setLoading(true);
        fetch('http://localhost:5000/api/office-notes')
            .then(res => res.json())
            .then(data => {
                setNotes(data);
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
            await fetch('http://localhost:5000/api/office-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    preparerId: 'admin' // Hardcoded for MVP, should be authed user
                })
            });
            setShowForm(false);
            fetchNotes();
        } catch (error) {
            console.error('Error creating note:', error);
        }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await fetch(`http://localhost:5000/api/office-notes/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, approverId: 'admin' })
            });
            fetchNotes();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    return (
        <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy">Office Notes</h2>
                    <p className="text-gray-500">Structured internal notes and approval workflow</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn-primary flex items-center space-x-2 bg-bank-teal text-white px-4 py-2 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-md"
                >
                    <Plus size={18} />
                    <span>{showForm ? 'Cancel' : 'Create New Note'}</span>
                </button>
            </div>

            {showForm && (
                <div className="card p-8 bg-white border border-bank-teal/20 shadow-xl animate-in slide-in-from-top duration-300">
                    <h3 className="text-xl font-bold text-bank-navy mb-6">Internal Office Note Draft</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Note Type</label>
                                <select
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-bank-teal"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="DD_AUTHORIZATION">Demand Draft Authorization</option>
                                    <option value="GL_HEAD_ACTIVATION">GL Head Activation</option>
                                    <option value="VISIT_REPORT">Executive Visit Report</option>
                                    <option value="CUSTOM">Custom Office Note</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Subject / Title</label>
                                <input
                                    type="text" required
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-bank-teal"
                                    placeholder="Brief subject of the note"
                                    value={formData.titleEn}
                                    onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Content / Details</label>
                            <textarea
                                rows={4} required
                                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-bank-teal"
                                placeholder="Enter detailed note content here..."
                                value={formData.contentJson.details}
                                onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, details: e.target.value } })}
                            />
                        </div>
                        <div className="flex justify-end pt-4">
                            <button type="submit" className="bg-bank-navy text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all">
                                Submit for Approval
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bank-teal"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {notes.length > 0 ? (
                        notes.map(note => (
                            <div key={note.id} className="card p-6 bg-white hover:border-bank-teal/30 transition-all border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className={`p-3 rounded-lg ${note.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                note.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <h3 className="font-bold text-bank-navy">{note.titleEn}</h3>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${note.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                        note.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-50 text-amber-600'
                                                    }`}>
                                                    {note.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-3 text-xs text-gray-400 font-medium mt-1">
                                                <span className="flex items-center space-x-1"><User size={12} /> <span>By: {note.preparer.fullNameEn}</span></span>
                                                <span>•</span>
                                                <span className="flex items-center space-x-1"><Clock size={12} /> <span>{format(new Date(note.createdAt), 'dd MMM yyyy')}</span></span>
                                                <span>•</span>
                                                <span className="uppercase tracking-widest text-[9px] bg-gray-100 px-1.5 py-0.5 rounded">{note.type.replace(/_/g, ' ')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {note.status === 'PENDING' && (
                                            <>
                                                <button
                                                    onClick={() => handleStatusUpdate(note.id, 'APPROVED')}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-all" title="Approve"
                                                >
                                                    <CheckCircle size={20} />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(note.id, 'REJECTED')}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-all" title="Reject"
                                                >
                                                    <XCircle size={20} />
                                                </button>
                                            </>
                                        )}
                                        <button className="p-2 text-gray-400 hover:text-bank-navy transition-all">
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-16 card border-dashed bg-gray-50">
                            <FileText className="mx-auto text-gray-300 mb-2" size={48} />
                            <p className="text-gray-500 font-medium text-lg">No office notes found</p>
                            <p className="text-gray-400 text-sm">Create internal drafts for authorization and reporting.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OfficeNoteManager;
