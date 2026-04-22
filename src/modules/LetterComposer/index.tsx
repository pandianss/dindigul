import React, { useState, useEffect } from 'react';
import { X, FileText, Check, Save, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { format } from 'date-fns';

// Types
import { Template, Branch, Signatory, LetterForm } from './types';

// Components
import { ConfigSidebar } from './components/Sidebar/ConfigSidebar';
import { EditorHeader } from './components/Editor/EditorHeader';
import { RichTextEditor } from './components/Editor/RichTextEditor';

interface LetterComposerProps {
    onClose: () => void;
    onSuccess: () => void;
}

const LetterComposer: React.FC<LetterComposerProps> = ({ onClose, onSuccess }) => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [signatories, setSignatories] = useState<Signatory[]>([]);
    const [selectedSignatoryId, setSelectedSignatoryId] = useState<string>('');
    const [selectedBranchId, setSelectedBranchId] = useState('');

    const [formData, setFormData] = useState<LetterForm>({
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
            const sigs = (signatoryRes.data || []) as Signatory[];
            setSignatories(sigs);
            
            const annamalai = sigs.find(s => s.fullNameEn?.includes('Annamalai'));
            if (annamalai) setSelectedSignatoryId(annamalai.id);
            setLoading(false);
        }).catch(err => {
            console.error('Failed to load metadata:', err);
            setLoading(false);
        });
    }, []);

    const handleApplyTemplate = (tpl: Template) => {
        setFormData(prev => ({
            ...prev,
            titleEn: tpl.subjectEn || '',
            titleHi: tpl.subjectHi || '',
            titleTa: tpl.subjectTa || '',
            contentEn: tpl.bodyEn || '',
            contentHi: tpl.bodyHi || '',
            contentTa: tpl.bodyTa || ''
        }));
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
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] overflow-hidden">
                {/* Header */}
                <div className="bg-bank-navy p-6 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center space-x-4">
                        <div className="bg-white/20 p-3 rounded-2xl">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">Compose New Letter</h2>
                            <p className="text-xs text-white/50 font-medium font-['Outfit'] uppercase tracking-widest">Formal Regional Correspondence</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3 bg-white/10 p-1.5 rounded-2xl">
                        <button 
                            onClick={() => setFormData(p => ({ ...p, isExternal: false }))}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!formData.isExternal ? 'bg-white text-bank-navy shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            Internal
                        </button>
                        <button 
                            onClick={() => setFormData(p => ({ ...p, isExternal: true }))}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.isExternal ? 'bg-white text-bank-navy shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            External
                        </button>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors">
                        <X size={28} />
                    </button>
                </div>

                <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
                    <ConfigSidebar 
                        formData={formData}
                        setFormData={setFormData}
                        branches={branches}
                        signatories={signatories}
                        templates={templates}
                        selectedBranchId={selectedBranchId}
                        setSelectedBranchId={setSelectedBranchId}
                        selectedSignatoryId={selectedSignatoryId}
                        setSelectedSignatoryId={setSelectedSignatoryId}
                        onApplyTemplate={handleApplyTemplate}
                        loading={loading}
                    />

                    {/* Main Editor */}
                    <div className="flex-grow flex flex-col p-8 overflow-hidden bg-white">
                        <EditorHeader 
                            activeLang={activeLang}
                            setActiveLang={setActiveLang}
                            isSourceMode={isSourceMode}
                            setIsSourceMode={setIsSourceMode}
                        />

                        <RichTextEditor 
                            formData={formData}
                            setFormData={setFormData}
                            activeLang={activeLang}
                            isSourceMode={isSourceMode}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center text-[10px] font-black text-gray-400 space-x-6 uppercase tracking-[0.2em]">
                        <div className="flex items-center space-x-2">
                            {formData.titleEn && formData.contentEn ? <Check size={12} className="text-emerald-500" /> : <div className="w-2 h-2 rounded-full bg-gray-200" />}
                            <span>English</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            {formData.titleHi && formData.contentHi ? <Check size={12} className="text-emerald-500" /> : <div className="w-2 h-2 rounded-full bg-gray-200" />}
                            <span>Hindi</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            {formData.titleTa && formData.contentTa ? <Check size={12} className="text-emerald-500" /> : <div className="w-2 h-2 rounded-full bg-gray-200" />}
                            <span>Tamil</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <button onClick={onClose} className="px-8 py-3 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 rounded-xl transition-all">Discard</button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-bank-navy text-white px-10 py-3.5 rounded-2xl font-black flex items-center space-x-3 shadow-xl hover:shadow-bank-navy/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {submitting ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                            <span className="text-xs uppercase tracking-widest">{submitting ? 'Saving...' : 'Save as Draft'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LetterComposer;
