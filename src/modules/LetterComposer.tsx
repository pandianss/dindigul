import React, { useState, useEffect } from 'react';
import { X, Send, FileText, Globe, Languages, ChevronDown, Check, Save, RefreshCw, Code } from 'lucide-react';
import api from '../services/api';
import { format, parse } from 'date-fns';
import { CustomDatePicker } from '../components/CustomDatePicker';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface Template {
    id: string;
    name: string;
    code: string;
    subjectEn: string;
    subjectHi?: string;
    subjectTa?: string;
    bodyEn: string;
    bodyHi?: string;
    bodyTa?: string;
}

interface Branch {
    id: string;
    nameEn: string;
    code: string;
}

interface LetterComposerProps {
    onClose: () => void;
    onSuccess: () => void;
}

const LetterComposer: React.FC<LetterComposerProps> = ({ onClose, onSuccess }) => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [signatories, setSignatories] = useState<any[]>([]);
    const [selectedSignatoryId, setSelectedSignatoryId] = useState<string>('');

    // Form State
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [formData, setFormData] = useState({
        titleEn: '', titleHi: '', titleTa: '',
        contentEn: '', contentHi: '', contentTa: '',
        period: format(new Date(), 'MMM yyyy'),
        isExternal: false,
        recipientName: '',
        recipientAddress: '',
        salutation: 'Sir/Madam,'
    });

    const [activeLang, setActiveLang] = useState<'EN' | 'HI' | 'TA'>('EN');
    const [isSourceMode, setIsSourceMode] = useState(false);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get('/branches'),
            api.get('/letters/templates'),
            api.get('/signatories')
        ]).then(([branchRes, templateRes, signatoryRes]) => {
            setBranches(branchRes.data || []);
            setTemplates(templateRes.data || []);
            const sigs = signatoryRes.data || [];
            setSignatories(sigs);
            // Default to Annamalai if found
            const annamalai = sigs.find((s: any) => s.fullNameEn?.includes('Annamalai'));
            if (annamalai) setSelectedSignatoryId(annamalai.id);
            setLoading(false);
        }).catch(err => {
            console.error('Failed to load metadata:', err);
            const status = err.response?.status;
            if (status === 403) {
                alert('Access Denied: You do not have permission to view the branch list. Functional features may be limited.');
            }
            setLoading(false);
        });
    }, []);

    const handleApplyTemplate = (tpl: Template) => {
        setFormData({
            ...formData,
            titleEn: tpl.subjectEn || '',
            titleHi: tpl.subjectHi || '',
            titleTa: tpl.subjectTa || '',
            contentEn: tpl.bodyEn || '',
            contentHi: tpl.bodyHi || '',
            contentTa: tpl.bodyTa || ''
        });
    };

    const handleSubmit = async () => {
        if (!formData.isExternal && !selectedBranchId) {
            alert('Please select a branch.');
            return;
        }

        if (!selectedSignatoryId) {
            alert('Please select a signing authority (Signatory).');
            return;
        }

        if (!formData.titleEn || !formData.contentEn) {
            alert('Please provide at least English title and content.');
            return;
        }

        if (formData.isExternal && (!formData.recipientName || !formData.recipientAddress)) {
            alert('Please provide recipient name and address for external correspondence.');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/letters', {
                ...formData,
                branchId: selectedBranchId || branches.find(b => b.code === '3933')?.id || branches[0]?.id,
                signatoryId: selectedSignatoryId,
                type: 'MANUAL'
            });
            onSuccess();
        } catch (error) {
            console.error('Failed to save letter:', error);
            alert('Failed to save letter draft.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-bank-navy/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-bank-navy p-5 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Compose New Letter</h2>
                            <p className="text-xs text-white/60">Create formal correspondence</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3 bg-white/10 p-1 rounded-xl">
                        <button 
                            onClick={() => setFormData({ ...formData, isExternal: false })}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!formData.isExternal ? 'bg-white text-bank-navy shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            Internal (Branch)
                        </button>
                        <button 
                            onClick={() => setFormData({ ...formData, isExternal: true })}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formData.isExternal ? 'bg-white text-bank-navy shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            External Authority
                        </button>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors ml-4">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
                    {/* Sidebar: Config & Templates */}
                    <div className="w-full md:w-72 bg-gray-50 border-r border-gray-100 p-6 overflow-y-auto space-y-6">
                        {!formData.isExternal ? (
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Recipient Branch</label>
                                <select
                                    value={selectedBranchId}
                                    onChange={(e) => setSelectedBranchId(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-bank-navy focus:ring-2 focus:ring-bank-navy/10 focus:border-bank-navy transition-all"
                                >
                                    <option value="">{loading ? 'Loading Branches...' : 'Select Branch...'}</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.code} - {b.nameEn}</option>
                                    ))}
                                </select>
                                {!loading && branches.length === 0 && (
                                    <p className="text-[10px] text-red-500 mt-1">No branches found. Check connection.</p>
                                )}
                            </div>
                        ) : (
                            <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                    <Globe size={12} />
                                    External Correspondence
                                </p>
                                <p className="text-[10px] text-amber-600 leading-tight">This letter will be addressed to an external authority but filed internally under the Regional Office.</p>
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block font-black">Letter Period</label>
                            <CustomDatePicker
                                selected={(() => {
                                    try {
                                        return parse(formData.period, 'MMM yyyy', new Date());
                                    } catch (e) {
                                        return new Date();
                                    }
                                })()}
                                onChange={(date) => setFormData({ 
                                    ...formData, 
                                    period: date ? format(date, 'MMM yyyy') : format(new Date(), 'MMM yyyy') 
                                })}
                                className="w-full font-bold text-bank-navy"
                                placeholderText="Select Period"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Signing Authority</label>
                            <div className="relative">
                                <select
                                    value={selectedSignatoryId}
                                    onChange={(e) => setSelectedSignatoryId(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-bank-navy focus:ring-2 focus:ring-bank-navy/10 focus:border-bank-navy transition-all appearance-none"
                                >
                                    <option value="">Select Signatory...</option>
                                    {signatories.map(s => (
                                        <option key={s.id} value={s.id}>{s.fullNameEn} ({s.designation?.nameEn})</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                            </div>
                        </div>

                        {formData.isExternal && (
                           <div className="space-y-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-2">
                                <div>
                                    <label className="text-[10px] font-black text-bank-teal uppercase mb-2 block tracking-widest leading-none">External Recipient</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Police Commissioner"
                                        value={formData.recipientName}
                                        onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                                        className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs font-bold text-bank-navy focus:border-bank-teal outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest leading-none">To Address</label>
                                    <textarea
                                        placeholder="Full address of the recipient..."
                                        rows={3}
                                        value={formData.recipientAddress}
                                        onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
                                        className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs font-bold text-bank-navy focus:border-bank-teal outline-none resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest leading-none">Form of Address</label>
                                    <input
                                        type="text"
                                        placeholder="Sir/Madam,"
                                        value={formData.salutation}
                                        onChange={(e) => setFormData({ ...formData, salutation: e.target.value })}
                                        className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs font-bold text-bank-navy"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Associated Internal Branch</label>
                                    <select
                                        value={selectedBranchId}
                                        onChange={(e) => setSelectedBranchId(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs font-bold text-bank-navy focus:ring-2 focus:ring-bank-navy/10 focus:border-bank-navy transition-all"
                                    >
                                        <option value="">Select Branch (Optional)...</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.code} - {b.nameEn}</option>
                                        ))}
                                    </select>
                                    <p className="text-[9px] text-gray-400 mt-1 italic">Defaults to Regional Office if left blank.</p>
                                </div>
                           </div>
                        )}

                        <div className="pt-4 border-t border-gray-200">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 block">Quick Templates</label>
                            <div className="space-y-2">
                                {templates.length > 0 ? templates.map(tpl => (
                                    <button
                                        key={tpl.id}
                                        onClick={() => handleApplyTemplate(tpl)}
                                        className="w-full text-left p-2.5 rounded-lg border border-gray-200 bg-white hover:border-bank-navy hover:shadow-sm transition-all text-xs group"
                                    >
                                        <p className="font-bold text-bank-navy line-clamp-1">{tpl.name}</p>
                                        <p className="text-gray-400 text-[10px] truncate">{tpl.subjectEn}</p>
                                    </button>
                                )) : (
                                    <p className="text-[10px] text-gray-400 italic">No templates available</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Editor */}
                    <div className="flex-grow flex flex-col p-6 overflow-hidden">
                        {/* Language Tabs */}
                        <div className="flex items-center space-x-1 mb-6 bg-gray-100 p-1 rounded-xl self-start">
                            <button
                                onClick={() => setActiveLang('EN')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-2 ${activeLang === 'EN' ? 'bg-white text-bank-navy shadow-sm' : 'text-gray-400'}`}
                            >
                                <Globe size={14} />
                                <span>ENGLISH</span>
                            </button>
                            <button
                                onClick={() => setActiveLang('HI')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-2 font-hindi ${activeLang === 'HI' ? 'bg-white text-bank-navy shadow-sm' : 'text-gray-400'}`}
                            >
                                <Languages size={14} />
                                <span>हिन्दी</span>
                            </button>
                            <button
                                onClick={() => setActiveLang('TA')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-2 font-tamil ${activeLang === 'TA' ? 'bg-white text-bank-navy shadow-sm' : 'text-gray-400'}`}
                            >
                                <Languages size={14} />
                                <span>தமிழ்</span>
                            </button>

                            <div className="w-px h-4 bg-gray-200 mx-2"></div>

                            <button
                                onClick={() => setIsSourceMode(!isSourceMode)}
                                title="Toggle HTML Source"
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center space-x-2 ${isSourceMode ? 'bg-bank-teal text-white shadow-lg' : 'bg-white text-gray-500 hover:text-bank-navy border border-gray-100 shadow-sm'}`}
                            >
                                <Code size={14} />
                                <span>{isSourceMode ? 'EDIT VISUAL' : 'EDIT SOURCE'}</span>
                            </button>
                        </div>

                        <div className="space-y-4 flex-grow flex flex-col overflow-y-auto pr-2 custom-scrollbar">
                            <div className="group">
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block group-focus-within:text-bank-navy transition-colors">
                                    {activeLang === 'EN' ? 'Subject' : activeLang === 'HI' ? 'विषय' : 'பொருள்'}
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter letter subject..."
                                    value={activeLang === 'EN' ? formData.titleEn : activeLang === 'HI' ? formData.titleHi : formData.titleTa}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (activeLang === 'EN') setFormData({ ...formData, titleEn: val });
                                        else if (activeLang === 'HI') setFormData({ ...formData, titleHi: val });
                                        else setFormData({ ...formData, titleTa: val });
                                    }}
                                    className={`w-full text-lg font-bold text-bank-navy border-0 border-b-2 border-gray-100 focus:ring-0 focus:border-bank-navy pb-2 transition-all ${activeLang === 'HI' ? 'font-hindi' : activeLang === 'TA' ? 'font-tamil' : ''}`}
                                />
                            </div>

                            <div className="flex-grow flex flex-col min-h-[400px]">
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Letter Body</label>
                                <div className={`flex-grow border border-gray-100 rounded-xl overflow-hidden flex flex-col bg-gray-50 ${activeLang === 'HI' ? 'font-hindi' : activeLang === 'TA' ? 'font-tamil' : ''}`}>
                                    {isSourceMode ? (
                                        <textarea
                                            value={activeLang === 'EN' ? formData.contentEn : activeLang === 'HI' ? formData.contentHi : formData.contentTa}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (activeLang === 'EN') setFormData({ ...formData, contentEn: val });
                                                else if (activeLang === 'HI') setFormData({ ...formData, contentHi: val });
                                                else setFormData({ ...formData, contentTa: val });
                                            }}
                                            className="flex-grow p-5 font-mono text-xs bg-gray-900 text-gray-100 outline-none resize-none leading-relaxed"
                                            placeholder="Paste or write raw HTML code here..."
                                        />
                                    ) : (
                                        <ReactQuill
                                            key={activeLang}
                                            theme="snow"
                                            placeholder="Type your letter content here..."
                                            value={activeLang === 'EN' ? formData.contentEn : activeLang === 'HI' ? formData.contentHi : formData.contentTa}
                                            onChange={(val) => {
                                                if (activeLang === 'EN') setFormData({ ...formData, contentEn: val });
                                                else if (activeLang === 'HI') setFormData({ ...formData, contentHi: val });
                                                else setFormData({ ...formData, contentTa: val });
                                            }}
                                            modules={{
                                                toolbar: [
                                                    [{ 'header': [1, 2, 3, false] }],
                                                    ['bold', 'italic', 'underline', 'strike'],
                                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                    [{ 'color': [] }, { 'background': [] }],
                                                    ['link', 'image', 'table'],
                                                    ['clean']
                                                ],
                                            }}
                                            className="flex-grow flex flex-col"
                                            style={{ height: '100%' }}
                                        />
                                    )}
                                </div>
                                    <style>{`
                                        .quill { display: flex; flex-direction: column; height: 100%; border: 1px solid #f3f4f6 !important; border-radius: 12px; overflow: hidden; background: white; }
                                        .ql-toolbar { border: none !important; border-bottom: 1px solid #f3f4f6 !important; background: #f9fafb; sticky: top; z-index: 10; padding: 10px !important; }
                                        .ql-container { border: none !important; flex-grow: 1; font-family: inherit; font-size: inherit; }
                                        .ql-editor { font-family: inherit; font-size: 15px; line-height: 1.6; min-height: 400px; padding: 20px !important; }
                                        .ql-editor.ql-blank::before { font-family: inherit; color: #9ca3af; font-style: normal; font-weight: normal; }
                                        .font-hindi .ql-editor { font-size: 1.2rem; }
                                        .font-tamil .ql-editor { font-size: 1.2rem; }
                                    `}</style>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-white border-t border-gray-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center text-[10px] font-bold text-gray-400 space-x-4 uppercase tracking-widest">
                        <div className="flex items-center space-x-1">
                            {formData.titleEn && formData.contentEn ? <Check size={12} className="text-green-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                            <span>English</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            {formData.titleHi && formData.contentHi ? <Check size={12} className="text-green-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                            <span>Hindi</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            {formData.titleTa && formData.contentTa ? <Check size={12} className="text-green-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                            <span>Tamil</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-bank-navy text-white px-8 py-2.5 rounded-xl font-bold flex items-center space-x-2 shadow-lg shadow-bank-navy/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {submitting ? (
                                <RefreshCw size={18} className="animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            <span>{submitting ? 'Saving...' : 'Save as Draft'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LetterComposer;
