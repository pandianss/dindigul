import React, { useState, useEffect, useCallback } from 'react';
import { 
    Plus, FileText, Download, Pencil, Trash2, Clock, CheckCircle, X, 
    LayoutDashboard, User, Calendar, IndianRupee, Building2, Layers, 
    Hash, Lock, Unlock, Copy, AlertTriangle, FileSpreadsheet, Eye, Save, Award
} from 'lucide-react';
import { format } from 'date-fns';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

import { CustomDatePicker } from '../../components/CustomDatePicker';
import DocumentPreview from '../../components/DocumentPreview';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/handleError';
import { formatLocalISO, parseLocalISO } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { REGIONAL_OFFICE_DATA, GLOBAL_CONFIG } from '../../constants/organization';

// Local module imports
import { OfficeNote, OfficeNoteFormState } from './types';
import { INITIAL_FORM, quillModules, quillStyle } from './constants';
import { SectionCard } from './components/SectionCard';

// Extracted Sub-forms
import { MICRRequestForm } from './components/MICRRequestForm';
import { ExpenseApprovalForm } from './components/ExpenseApprovalForm';
import { BrokenPeriodInterestForm } from './components/BrokenPeriodInterestForm';
import { ReversalChargesForm } from './components/ReversalChargesForm';
import { GLHeadActivationForm } from './components/GLHeadActivationForm';
import { RBIProformaForm } from './components/RBIProformaForm';
import { ProformaBranchCodeForm } from './components/ProformaBranchCodeForm';
import { HighValueDDForm } from './components/HighValueDDForm';

const OfficeNoteManager: React.FC = () => {
    const { user: authUser } = useAuth();
    const [notes, setNotes] = useState<OfficeNote[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<OfficeNoteFormState>(INITIAL_FORM);
    const [selectedDept, setSelectedDept] = useState<string>('');
    const [initiators, setInitiators] = useState<any[]>([]);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [summaryConfig, setSummaryConfig] = useState({ period: 'weekly', date: format(new Date(), 'yyyy-MM-dd') });
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [previewNote, setPreviewNote] = useState<any>(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const fetchNotes = useCallback(() => {
        setLoading(true);
        api.get('/office-notes')
            .then((res: any) => {
                setNotes(res.data.data || res.data);
                setLoading(false);
            })
            .catch((err: unknown) => {
                alert(getErrorMessage(err));
                setLoading(false);
            });
    }, []);

    const fetchDepartments = useCallback(() => {
        api.get('/departments')
            .then((res: any) => setDepartments(res.data))
            .catch(err => console.error('Error fetching departments'));
    }, []);

    const fetchInitiators = useCallback(() => {
        api.get('/office-notes/initiators')
            .then((res: any) => setInitiators(res.data))
            .catch(err => console.error('Error fetching initiators'));
    }, []);

    useEffect(() => {
        fetchNotes();
        fetchDepartments();
        fetchInitiators();
        const user = authUser || {} as any;
        if (user.department?.nameEn) {
            setSelectedDept(user.department.nameEn);
        }
        
        if (!editingId && !formData.preparerId) {
            setFormData(prev => ({ ...prev, preparerId: user.id }));
        }
    }, [authUser, editingId, fetchNotes, fetchDepartments, fetchInitiators, formData.preparerId]);

    // Suggest reference when department or date changes
    useEffect(() => {
        if (showForm && selectedDept) {
            const isDeptChanged = !formData.deptName || formData.deptName !== selectedDept;
            if (!editingId || isDeptChanged) {
                const noteDate = formData.contentJson.noteDate;
                api.get(`/office-notes/suggest-reference?deptName=${encodeURIComponent(selectedDept)}${noteDate ? `&date=${noteDate}` : ''}`)
                    .then((res: any) => {
                        setFormData(prev => ({ 
                            ...prev, 
                            referenceNo: res.data.referenceNo,
                            deptName: selectedDept
                        }));
                    })
                    .catch(err => console.error('Suggest reference error:', err));
            }
        }
    }, [selectedDept, showForm, editingId, formData.contentJson.noteDate, formData.deptName]);

    // Auto-lookup Branch Details when SOL ID changes
    useEffect(() => {
        const sol = formData.contentJson.branchSol;
        if (sol && sol.length === 4) {
            api.get(`/branches/code/${sol}`)
                .then((res: any) => {
                    const grade = res.data.headUser?.grade || 'Not found';
                    const branchName = res.data.nameEn || 'Not found';
                    setFormData(prev => ({
                        ...prev,
                        contentJson: { 
                            ...prev.contentJson, 
                            branchHeadGrade: grade,
                            issuingBranch: `${branchName} (${sol})`
                        }
                    }));
                })
                .catch(err => {
                    console.error('SOL Lookup Error:', err);
                    setFormData(prev => ({
                        ...prev,
                        contentJson: { ...prev.contentJson, branchHeadGrade: 'Error', issuingBranch: 'Error' }
                    }));
                });
        }
    }, [formData.contentJson.branchSol]);

    // Auto-update subjects for High Value DD
    useEffect(() => {
        if (formData.type === 'HIGH_VALUE_DD') {
            const issuingBranch = formData.contentJson.issuingBranch || '';
            const txnId = formData.contentJson.transactionId || '';
            const applicant = formData.contentJson.applicantName || '';

            const titleEn = `${issuingBranch} - ${txnId} - ${applicant}`;
            
            const currentCirculars = formData.contentJson.policyCirculars || [];
            const hasDefaults = currentCirculars.some((c: any) => c.ref === '1/2011-12');
            
            if (formData.titleEn !== titleEn || !hasDefaults) {
                setFormData(prev => ({
                    ...prev,
                    titleEn,
                    titleHi: titleEn,
                    titleTa: titleEn,
                    contentJson: {
                        ...prev.contentJson,
                        policyCirculars: hasDefaults ? prev.contentJson.policyCirculars : [
                            { dept: 'Inter Branch Reconciliation Division', date: '2011-04-02', ref: '1/2011-12' },
                            { dept: 'Banking Operations', date: '2018-11-01', ref: 'Misc/452/2018-19' }
                        ]
                    }
                }));
            }
        }
    }, [formData.type, formData.titleEn, formData.contentJson.issuingBranch, formData.contentJson.transactionId, formData.contentJson.applicantName, formData.contentJson.policyCirculars]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const user = authUser || {} as any;
            const finalFormData = { ...formData, deptName: selectedDept || formData.deptName };
            const effectivePreparerId = formData.preparerId || user.id || 'admin';

            if (editingId) {
                await api.put(`/office-notes/${editingId}`, { ...finalFormData, preparerId: effectivePreparerId });
            } else {
                await api.post('/office-notes', { ...finalFormData, preparerId: effectivePreparerId });
            }
            setShowForm(false);
            setEditingId(null);
            setFormData(INITIAL_FORM);
            fetchNotes();
        } catch (error) {
            alert(getErrorMessage(error));
        }
    };

    const handleEdit = (note: any) => {
        const content = typeof note.contentJson === 'string' ? JSON.parse(note.contentJson) : note.contentJson;
        const initialDept = note.preparer?.department?.nameEn || '';
        setSelectedDept(initialDept);
        setEditingId(note.id);
        setFormData({
            type: note.type,
            titleEn: note.titleEn,
            titleTa: content.titleTa || '',
            titleHi: content.titleHi || '',
            deptName: initialDept,
            referenceNo: note.referenceNo || '',
            contentJson: content,
            preparerId: note.preparerId
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDuplicate = (note: any) => {
        const content = typeof note.contentJson === 'string' ? JSON.parse(note.contentJson) : note.contentJson;
        const initialDept = note.preparer?.department?.nameEn || selectedDept;
        setSelectedDept(initialDept);
        setEditingId(null);
        setFormData({
            type: note.type,
            titleEn: `${note.titleEn} (Duplicate)`,
            titleTa: content.titleTa || '',
            titleHi: content.titleHi || '',
            deptName: initialDept,
            referenceNo: '',
            contentJson: {
                ...content,
                noteDate: formatLocalISO(new Date()),
                isFrozen: false,
                transactionId: note.type === 'HIGH_VALUE_DD' ? '' : (content.transactionId || ''),
            },
            preparerId: note.preparerId
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await api.delete(`/office-notes/${id}`);
            fetchNotes();
        } catch (error) {
            alert(getErrorMessage(error));
        }
    };

    const handleDownloadPDF = async (id: string, title: string, noteDate?: string) => {
        try {
            const response = await api.get(`/office-notes/${id}/pdf`, {
                params: { manualDate: noteDate },
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
            alert(getErrorMessage(error));
        }
    };

    const handleDownloadDDRequest = async (id: string) => {
        try {
            const response = await api.get(`/office-notes/${id}/dd-request-form`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `DD_Request_Form_${id.slice(-4)}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert('Failed to download Request Form');
        }
    };

    const handlePreviewPDF = async (id: string, noteDate?: string) => {
        try {
            const response = await api.get(`/office-notes/${id}/pdf`, {
                params: { manualDate: noteDate },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            window.open(url, '_blank');
        } catch (error) {
            alert(getErrorMessage(error));
        }
    };

    const handleSaveSealPos = async (noteId: string, pos: { x: number, y: number }) => {
        try {
            const note = notes.find(n => n.id === noteId);
            if (!note) return;
            const content = typeof note.contentJson === 'string' ? JSON.parse(note.contentJson) : note.contentJson;
            await api.put(`/office-notes/${noteId}`, {
                ...note,
                contentJson: { ...content, sealX: pos.x, sealY: pos.y }
            });
            fetchNotes();
        } catch (err) {
            alert('Failed to save seal position: ' + getErrorMessage(err));
        }
    };

    const handleFreeze = async (id: string, title: string) => {
        if (!window.confirm(`Freeze "${title}" Permanently?`)) return;
        try {
            await api.patch(`/office-notes/${id}/freeze`);
            fetchNotes();
        } catch (error) {
            alert(getErrorMessage(error));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const selectAll = () => {
        if (selectedIds.length === notes.length) setSelectedIds([]);
        else setSelectedIds(notes.map(n => n.id));
    };

    const handleGenerateSummary = async () => {
        try {
            const response = await api.get('/office-notes/high-value-dd/summary', {
                params: summaryConfig,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `HighValueDD_Summary_${summaryConfig.period}_${summaryConfig.date}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setShowSummaryModal(false);
        } catch (error) {
            alert(getErrorMessage(error));
        }
    };

    const handleUploadScan = async (noteId: string, file: File) => {
        const formData = new FormData();
        formData.append('document', file);
        try {
            await api.post(`/office-notes/${noteId}/upload-scan`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Scanned signed copy uploaded successfully');
            fetchNotes();
        } catch (err) {
            alert('Failed to upload scanned copy: ' + getErrorMessage(err));
        }
    };

    const handleForwardToRO = async (noteId: string) => {
        if (!window.confirm('Forward to Regional Office?')) return;
        try {
            await api.patch(`/office-notes/${noteId}/forward`);
            alert('Note successfully forwarded to Regional Office');
            fetchNotes();
        } catch (err) {
            alert('Failed to forward note: ' + getErrorMessage(err));
        }
    };

    return (
        <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold text-bank-navy tracking-tight">Office Note Manager</h2>
                    <p className="text-gray-500 font-medium mt-1">Regional Office official trilingual correspondence module</p>
                </div>
                <div className="flex items-center space-x-3">
                    {selectedIds.length > 0 && (
                        <button onClick={() => {}} className="flex items-center space-x-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg active:scale-95 animate-in fade-in slide-in-from-right-4">
                            <Download size={20} />
                            <span>Download {selectedIds.length} Selected</span>
                        </button>
                    )}
                    <button onClick={() => setShowSummaryModal(true)} className="flex items-center space-x-2 bg-white text-bank-navy border-2 border-bank-navy px-6 py-3 rounded-xl font-bold hover:bg-bank-navy hover:text-white transition-all shadow-md active:scale-95">
                        <FileSpreadsheet size={20} />
                        <span>Summary Report</span>
                    </button>
                    <button onClick={() => setShowForm(!showForm)} className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${showForm ? 'bg-red-50 text-red-600' : 'bg-bank-teal text-white hover:bg-opacity-90 active:scale-95'}`}>
                        {showForm ? <X /> : <Plus />}
                        <span>{showForm ? 'Discard Draft' : 'Initiate New Note'}</span>
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="card p-10 bg-white border border-bank-teal/20 shadow-2xl rounded-2xl animate-in slide-in-from-top duration-500">
                    <div className="flex items-center space-x-3 mb-8 border-b pb-4">
                        <div className="p-3 bg-bank-navy text-white rounded-xl shadow-inner">
                            <LayoutDashboard size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-bank-navy">{editingId ? 'Edit Document' : 'Document Initiation Form'}</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Master Template: Trilingual Vector PDF</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Note Type</label>
                                <select 
                                    className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal font-bold bg-gray-50/50"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="CUSTOM">Custom Office Note</option>
                                    <option value="EXPENSE_APPROVAL">Expense Approval Note</option>
                                    <option value="HIGH_VALUE_DD">High Value DD Note</option>
                                    <optgroup label="Branch Network Management">
                                        <option value="PROFORMA_BRANCH_CODE">Proforma for Branch Code</option>
                                        <option value="RBI_BO_PROFORMA">RBI Annex-I — BO Reporting Proforma</option>
                                        <option value="MICR_CODE_REQUEST">MICR Code Request</option>
                                    </optgroup>
                                    <option value="BROKEN_INTEREST">Broken Period Interest</option>
                                    <option value="REVERSAL_CHARGES">Reversal of Charges</option>
                                    <option value="GL_HEAD_ACTIVATION">GL Head Activation Request</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Note Initiator</label>
                                <select 
                                    className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal font-bold bg-bank-teal/5"
                                    value={formData.preparerId}
                                    onChange={(e) => setFormData({ ...formData, preparerId: e.target.value })}
                                >
                                    <option value="">Select Initiator</option>
                                    {initiators.map(u => <option key={u.id} value={u.id}>{u.fullNameEn}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Note Date</label>
                                <CustomDatePicker
                                    selected={parseLocalISO(formData.contentJson.noteDate)}
                                    onChange={(d: Date | null) => setFormData({ ...formData, contentJson: { ...formData.contentJson, noteDate: formatLocalISO(d) } })}
                                    className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl font-bold bg-gray-50/50"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Department</label>
                                <select 
                                    className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl font-bold bg-gray-50/50"
                                    value={selectedDept}
                                    onChange={(e) => setSelectedDept(e.target.value)}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((d: any) => <option key={d.id} value={d.nameEn}>{d.nameEn}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Subject (English)</label>
                                <input 
                                    type="text" required 
                                    className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all"
                                    value={formData.titleEn}
                                    onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Reference Number</label>
                                <input 
                                    type="text"
                                    className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl font-mono font-bold bg-bank-teal/5 outline-none focus:border-bank-teal"
                                    value={formData.referenceNo}
                                    onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Sub-form Injection */}
                        <div className="mt-8 transition-all">
                            {formData.type === 'RBI_BO_PROFORMA' && <RBIProformaForm formData={formData} setFormData={setFormData} />}
                            {formData.type === 'MICR_CODE_REQUEST' && <MICRRequestForm formData={formData} setFormData={setFormData} />}
                            {formData.type === 'EXPENSE_APPROVAL' && <ExpenseApprovalForm formData={formData} setFormData={setFormData} />}
                            {formData.type === 'BROKEN_INTEREST' && <BrokenPeriodInterestForm formData={formData} setFormData={setFormData} />}
                            {formData.type === 'REVERSAL_CHARGES' && <ReversalChargesForm formData={formData} setFormData={setFormData} />}
                            {formData.type === 'GL_HEAD_ACTIVATION' && <GLHeadActivationForm formData={formData} setFormData={setFormData} />}
                            {formData.type === 'PROFORMA_BRANCH_CODE' && <ProformaBranchCodeForm formData={formData} setFormData={setFormData} />}
                            {formData.type === 'HIGH_VALUE_DD' && <HighValueDDForm formData={formData} setFormData={setFormData} />}
                            
                            {formData.type === 'CUSTOM' && (
                                <div className="space-y-6">
                                    <SectionCard title="General Details">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Amount (₹)</label>
                                                <input 
                                                    type="number"
                                                    className="w-full px-5 py-3 border rounded-xl outline-none focus:border-bank-teal"
                                                    value={formData.contentJson.amount}
                                                    onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, amount: e.target.value } })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Unit / Branch</label>
                                                <input 
                                                    type="text"
                                                    className="w-full px-5 py-3 border rounded-xl outline-none focus:border-bank-teal"
                                                    value={formData.contentJson.branch}
                                                    onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, branch: e.target.value } })}
                                                />
                                            </div>
                                        </div>
                                    </SectionCard>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Narrative / Proposal</label>
                                        <ReactQuill theme="snow" value={formData.contentJson.details} onChange={(val) => setFormData({ ...formData, contentJson: { ...formData.contentJson, details: val } })} modules={quillModules} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-6 border-t">
                            <button type="submit" className="bg-bank-navy text-white px-12 py-4 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center space-x-3">
                                <FileText size={20} />
                                <span>{editingId ? 'Update Note' : 'Commit & Generate Note'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {notes.map((note) => (
                    <div key={note.id} className="card p-4 bg-white border-2 border-transparent hover:border-bank-teal shadow-sm transition-all flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <input type="checkbox" className="w-5 h-5 rounded cursor-pointer" checked={selectedIds.includes(note.id)} onChange={() => toggleSelect(note.id)} />
                            <div className="p-3 rounded-xl bg-bank-navy/5 text-bank-navy">
                                <FileText size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-bank-navy leading-tight">{note.titleEn}</h3>
                                <div className="flex items-center space-x-3 text-[11px] text-gray-400 mt-1">
                                    <span className="font-bold">{note.preparer?.fullNameEn}</span>
                                    <span>•</span>
                                    <span>{format(new Date(note.createdAt), 'do MMM yyyy')}</span>
                                    <span>•</span>
                                    <span className="font-mono text-[9px] uppercase">REF: {note.referenceNo || 'PENDING'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => handleDownloadPDF(note.id, note.titleEn)} className="flex items-center space-x-2 bg-bank-navy text-white px-4 py-1.5 rounded-xl font-semibold text-xs">
                                <Download size={16} />
                                <span>PDF</span>
                            </button>
                            <button onClick={() => { setPreviewNote(note); setShowPreviewModal(true); }} className="p-2 text-bank-teal hover:bg-bank-teal/5 rounded-lg transition-all">
                                <Eye size={20} />
                            </button>
                            <button onClick={() => handleEdit(note)} className="p-2 text-gray-400 hover:text-bank-teal"><Pencil size={18} /></button>
                            <button onClick={() => handleDelete(note.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {showPreviewModal && previewNote && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-bank-navy/80 backdrop-blur-md p-8 overflow-y-auto">
                    <div className="w-full max-w-5xl h-full flex flex-col">
                        <div className="flex justify-end mb-4">
                            <button onClick={() => setShowPreviewModal(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-all shadow-xl">
                                <X size={32} />
                            </button>
                        </div>
                        {(() => {
                            const content = typeof previewNote.contentJson === 'string' ? JSON.parse(previewNote.contentJson) : previewNote.contentJson;
                            const user = authUser || {} as any;
                            const org = user.organization || { bankNameEn: GLOBAL_CONFIG.bankName, officeNameEn: REGIONAL_OFFICE_DATA.name.toUpperCase() };
                            const signatories = (content.signatories || []).map((sig: any) => ({ name: sig.label, titleEn: sig.title || sig.role || 'Staff' }));
                            const initiator = previewNote.preparer ? { name: previewNote.preparer.fullNameEn, titleEn: previewNote.preparer.designationEn || 'Initiator' } : { name: user.fullNameEn || 'System User', titleEn: 'Initiator' };
                            
                            return (
                                <DocumentPreview
                                    title={previewNote.titleEn}
                                    refNo={previewNote.referenceNo}
                                    date={content.noteDate}
                                    bodyHtml={content.details || content.purpose || ''}
                                    initiator={initiator}
                                    reviewers={signatories.slice(0, -1)}
                                    approver={signatories[signatories.length - 1] || { name: 'Regional Manager', titleEn: 'Approving Authority' }}
                                    organization={org}
                                    onSaveSealPos={(pos) => handleSaveSealPos(previewNote.id, pos)}
                                />
                            );
                        })()}
                    </div>
                </div>
            )}
            <style>{quillStyle}</style>
        </div>
    );
};

export default OfficeNoteManager;
