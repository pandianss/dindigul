import React from 'react';
import { Plus } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Department, ManualForm } from '../../types';
import { QUILL_MODULES, QUILL_FORMATS } from '../../constants';

interface ManualModalProps {
    editingId: string | null;
    departments: Department[];
    manualForm: ManualForm;
    setManualForm: (form: ManualForm) => void;
    onSave: (e: React.FormEvent) => void;
    onClose: () => void;
    isAuthorized: boolean;
}

export const ManualModal: React.FC<ManualModalProps> = ({
    editingId,
    departments,
    manualForm,
    setManualForm,
    onSave,
    onClose,
    isAuthorized
}) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bank-navy/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#fcfcfc] rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
                <div className="p-10 bg-bank-navy text-white relative">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.05] rotate-12">
                        <Plus size={120} />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        {editingId ? 'EDIT MANUAL' : 'CREATE NEW MANUAL'}
                    </h2>
                    <p className="text-[10px] font-bold text-bank-gold uppercase tracking-[0.25em] mt-2 opacity-80">
                        Define scope and trilingual identifiers
                    </p>
                </div>
                
                <form onSubmit={onSave} className="p-10 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        {isAuthorized && (
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Owning Department</label>
                                <select
                                    required
                                    value={manualForm.departmentId}
                                    onChange={e => setManualForm({ ...manualForm, departmentId: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-bank-navy/5 focus:bg-white transition-all font-black text-xs text-bank-navy uppercase tracking-widest"
                                >
                                    <option value="">Select Department</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.nameEn}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">English Title</label>
                            <input
                                required
                                value={manualForm.titleEn}
                                onChange={e => setManualForm({ ...manualForm, titleEn: e.target.value })}
                                className="w-full px-5 py-3.5 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-bank-teal/5 focus:bg-white transition-all font-bold text-bank-navy"
                                placeholder="e.g. Branch Audit SOP"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 font-tamil">தமிழ் தலைப்பு</label>
                                <input
                                    value={manualForm.titleTa}
                                    onChange={e => setManualForm({ ...manualForm, titleTa: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-bank-teal/5 focus:bg-white transition-all font-medium font-tamil text-bank-teal"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 font-hindi">हिंदी शीर्षक</label>
                                <input
                                    value={manualForm.titleHi}
                                    onChange={e => setManualForm({ ...manualForm, titleHi: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-bank-teal/5 focus:bg-white transition-all font-medium font-hindi text-bank-gold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Scope/Description / SOP Overview</label>
                            <div className="bg-gray-100 rounded-2xl overflow-hidden border-none focus-within:ring-4 focus-within:ring-bank-teal/5 focus-within:bg-white transition-all">
                                <ReactQuill
                                    theme="snow"
                                    value={manualForm.description}
                                    onChange={content => setManualForm({ ...manualForm, description: content })}
                                    modules={QUILL_MODULES}
                                    formats={QUILL_FORMATS}
                                    placeholder="Detailed scope, objectives, and overview..."
                                    className="bg-transparent border-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                        <button type="submit" className="px-10 py-3.5 bg-bank-navy text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-bank-navy/20 active:scale-95 transition-all">
                            {editingId ? 'Update Manual' : 'Confirm & Save'}
                        </button>
                    </div>
                </form>
                <style>{`
                    .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #f3f4f6 !important; background: white; padding: 4px 8px !important; }
                    .ql-container.ql-snow { border: none !important; font-family: inherit; font-size: 13px; min-height: 120px; }
                    .ql-editor { padding: 12px 15px !important; min-height: 120px; }
                `}</style>
            </div>
        </div>
    );
};
