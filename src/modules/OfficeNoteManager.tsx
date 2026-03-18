import React, { useState, useEffect } from 'react';
import { FileText, Plus, Clock, User, Download, Eye, Building2, IndianRupee, LayoutDashboard, Pencil, Trash2, Hash } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { getErrorMessage } from '../utils/handleError';


interface OfficeNote {
    id: string;
    type: string;
    status: string;
    titleEn: string;
    contentJson: string;
    referenceNo?: string;
    preparer: { fullNameEn: string, username: string };
    createdAt: string;
}

const INITIAL_FORM = {
    type: 'CUSTOM',
    titleEn: '',
    titleTa: '',
    titleHi: '',
    deptName: '',
    referenceNo: '',
    contentJson: {
        details: '',
        amount: '',
        branch: '',
        justification: '',
        reference: '',
        dateOfOpening: '',
        branchName: '',
        permissionDetails: '',
        populationCategory: 'RURAL',
        populationCentre: '',
        communityBlock: '',
        talukTehsil: '',
        districtState: '',
        workingHours: '',
        postalAddress: '',
        currencyChest: '',
        authorisedDealer: '',
        underCBS: 'Yes',
        micrCode: ''
    }
};

const OfficeNoteManager: React.FC = () => {
    const [notes, setNotes] = useState<OfficeNote[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [selectedDept, setSelectedDept] = useState<string>('');

    const fetchNotes = () => {
        setLoading(true);
        api.get('/office-notes')
            .then((res: Record<string, any>) => {
                setNotes(res.data.data || res.data);
                setLoading(false);
            })
            .catch((err: unknown) => {
                alert(getErrorMessage(err));
                setLoading(false);
            });
    };

    const fetchDepartments = () => {
        api.get('/departments')
            .then((res: any) => setDepartments(res.data))
            .catch(err => console.error('Error fetching departments'));
    };

    useEffect(() => {
        fetchNotes();
        fetchDepartments();
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.department?.nameEn) {
            setSelectedDept(user.department.nameEn);
        }
    }, []);

    // Suggest reference when department changes
    useEffect(() => {
        // Condition:
        // 1. Dept is selected
        // 2. Form is visible
        // 3. Either it's a NEW note OR it's an EDIT note where the user INTENTIONALLY changed the dept from the one currently in the form!
        if (selectedDept && showForm) {
            const isDeptChanged = formData.deptName && formData.deptName !== selectedDept;
            
            if (!editingId || isDeptChanged) {
                api.get(`/office-notes/suggest-reference?deptName=${encodeURIComponent(selectedDept)}`)
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
    }, [selectedDept, showForm, editingId, formData.deptName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            // Ensure final deptName is synced if the suggest call hadn't finished or something
            const finalFormData = { ...formData, deptName: selectedDept || formData.deptName };

            if (editingId) {
                await api.put(`/office-notes/${editingId}`, {
                    ...finalFormData,
                    preparerId: user.id
                });
            } else {
                await api.post('/office-notes', {
                    ...finalFormData,
                    preparerId: user.id || 'admin'
                });
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
        
        // Use the department from the preparer as initial selectedDept for the dropdown
        const initialDept = note.preparer?.department?.nameEn || '';
        setSelectedDept(initialDept);

        setEditingId(note.id);
        setFormData({
            type: note.type,
            titleEn: note.titleEn,
            titleTa: content.titleTa || '',
            titleHi: content.titleHi || '',
            deptName: initialDept, // Update to something meaningful
            referenceNo: note.referenceNo || '',
            contentJson: content
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this office note? This will free up its reference number.')) return;
        try {
            await api.delete(`/office-notes/${id}`);
            fetchNotes();
        } catch (error) {
            alert(getErrorMessage(error));
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
            alert(getErrorMessage(error));
        }
    };

    const handlePreviewPDF = async (id: string) => {
        try {
            const response = await api.get(`/office-notes/${id}/pdf`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            window.open(url, '_blank');
        } catch (error) {
            alert(getErrorMessage(error));
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
                    onClick={() => {
                        setShowForm(!showForm);
                        if (showForm) {
                            setEditingId(null);
                            setFormData(INITIAL_FORM);
                        }
                    }}
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
                            <h3 className="text-2xl font-bold text-bank-navy">{editingId ? 'Edit Document' : 'Document Initiation Form'}</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Master Template: Trilingual Vector PDF</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Note Type</label>
                                <select
                                    className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy font-bold bg-gray-50/50"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="CUSTOM">Custom Office Note</option>
                                    <option value="PROFORMA_BRANCH_CODE">Proforma for Branch Code</option>
                                    <option value="DD_AUTHORIZATION">Demand Draft Authorization</option>
                                    <option value="GL_HEAD_ACTIVATION">GL Head Activation</option>
                                    <option value="VISIT_REPORT">Executive Visit Report</option>
                                    <option value="BROKEN_INTEREST">Broken Period Interest</option>
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Department</label>
                                <select
                                    className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy font-bold bg-gray-50/50"
                                    value={selectedDept}
                                    onChange={(e) => setSelectedDept(e.target.value)}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((d: any) => (
                                        <option key={d.id} value={d.nameEn}>{d.nameEn}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    <Hash size={14} className="text-bank-teal" />
                                    <span>Reference Number</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy font-mono font-bold bg-bank-teal/5"
                                    placeholder="Enter or generated automatically"
                                    value={formData.referenceNo}
                                    onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                                />
                                <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter italic">Recommended: RO/DEPT/YYYY/BEXX</p>
                            </div>
                            <div className="md:col-span-4 space-y-4">
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

                        {formData.type === 'PROFORMA_BRANCH_CODE' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-bank-teal/5 rounded-2xl border border-bank-teal/20">
                                <div className="md:col-span-2">
                                    <h4 className="text-bank-navy font-bold text-sm uppercase tracking-wider border-b border-bank-teal/20 pb-2 mb-4">Branch Code Obtention Details</h4>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">1. Date of Opening</label>
                                    <input type="date" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.dateOfOpening} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, dateOfOpening: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">2. Name of Branch / Office</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.branchName} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, branchName: e.target.value } })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">3. Permission Letter / License Details</label>
                                    <textarea rows={2} className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.permissionDetails} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, permissionDetails: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">4. Population Category</label>
                                    <select className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.populationCategory} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, populationCategory: e.target.value } })}>
                                        <option value="METRO">Metro</option>
                                        <option value="URBAN">Urban</option>
                                        <option value="SEMI_URBAN">Semi Urban</option>
                                        <option value="RURAL">Rural</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">5. Population Centre</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.populationCentre} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, populationCentre: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">6. Community Development Block</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.communityBlock} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, communityBlock: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">7. Taluk / Tehsil</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.talukTehsil} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, talukTehsil: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">8. District and State</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.districtState} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, districtState: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">9. Working Hours</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.workingHours} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, workingHours: e.target.value } })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">10. Complete Postal Address with Pin Code</label>
                                    <textarea rows={2} className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.postalAddress} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, postalAddress: e.target.value } })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">11. Nearest Currency Chest</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        placeholder="Part I/II code, Bank Name, Distance in KM"
                                        value={formData.contentJson.currencyChest} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, currencyChest: e.target.value } })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">12. Authorised Dealer (FX Routing)</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        placeholder="Branch Name and Part I/II Code"
                                        value={formData.contentJson.authorisedDealer} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, authorisedDealer: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">13. Whether branch is under CBS</label>
                                    <select className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.underCBS} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, underCBS: e.target.value } })}>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">14. MICR Code</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.micrCode} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, micrCode: e.target.value } })} />
                                </div>
                            </div>
                        ) : (
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
                        )}

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
                                <span>{editingId ? 'Update & Finalize Vector PDF' : 'Commit & Generate Vector PDF'}</span>
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
                                                <span className="font-mono text-[10px] text-gray-400 font-bold uppercase">REF: {note.referenceNo || 'PENDING'}</span>
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
                                        <button 
                                            onClick={() => handlePreviewPDF(note.id)}
                                            className="p-3 text-gray-300 hover:text-bank-navy hover:bg-gray-100 rounded-xl transition-all tooltip"
                                        >
                                            <Eye size={24} />
                                        </button>
                                        <div className="h-8 w-[1px] bg-gray-100 mx-2"></div>
                                        <button 
                                            onClick={() => handleEdit(note)}
                                            className="p-3 text-gray-300 hover:text-bank-teal hover:bg-bank-teal/5 rounded-xl transition-all"
                                        >
                                            <Pencil size={20} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(note.id)}
                                            className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={20} />
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
