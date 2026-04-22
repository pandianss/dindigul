import React from 'react';
import { List as ListIcon } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { ActivityForm } from '../../types';
import { QUILL_MODULES, QUILL_FORMATS, FREQUENCY_CONFIG } from '../../constants';

interface ActivityModalProps {
    editingId: string | null;
    activityForm: ActivityForm;
    setActivityForm: (form: ActivityForm) => void;
    onSave: (e: React.FormEvent) => void;
    onClose: () => void;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
    editingId,
    activityForm,
    setActivityForm,
    onSave,
    onClose
}) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bank-teal/20 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-500 border border-bank-teal/10">
                <div className="p-10 bg-bank-teal text-white relative">
                    <div className="absolute top-0 right-0 p-10 opacity-10">
                        <ListIcon size={120} />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-4 font-mono">
                        {editingId ? 'UPDATE STEP' : 'NEW SOP STEP'}
                    </h2>
                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.25em] mt-2 leading-none">
                        Define frequency and reporting schedule
                    </p>
                </div>
                
                <form onSubmit={onSave} className="p-10 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Activity Title / Action</label>
                            <input
                                required
                                value={activityForm.titleEn}
                                onChange={e => setActivityForm({ ...activityForm, titleEn: e.target.value })}
                                className="w-full px-5 py-3.5 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-bank-teal/5 focus:bg-white transition-all font-bold text-bank-navy"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Frequency</label>
                                <select
                                    value={activityForm.frequency}
                                    onChange={e => setActivityForm({ ...activityForm, frequency: e.target.value as any })}
                                    className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-bank-teal/5 focus:bg-white transition-all font-black text-[10px] uppercase tracking-widest text-indigo-700"
                                >
                                    {Object.entries(FREQUENCY_CONFIG).map(([val, { label }]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Milestone</label>
                                <input
                                    value={activityForm.dueDate}
                                    onChange={e => setActivityForm({ ...activityForm, dueDate: e.target.value })}
                                    className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-bank-teal/5 focus:bg-white transition-all font-bold text-bank-gold text-xs"
                                    placeholder="5th of Month"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Status</label>
                                <select
                                    value={activityForm.status}
                                    onChange={e => setActivityForm({ ...activityForm, status: e.target.value })}
                                    className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-bank-teal/5 focus:bg-white transition-all font-black text-[10px] uppercase tracking-widest text-emerald-600"
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Detailed Instructions / Procedure Steps</label>
                            <div className="bg-gray-100 rounded-2xl overflow-hidden border-none focus-within:ring-4 focus-within:ring-bank-teal/5 focus-within:bg-white transition-all">
                                <ReactQuill
                                    theme="snow"
                                    value={activityForm.description}
                                    onChange={content => setActivityForm({ ...activityForm, description: content })}
                                    modules={QUILL_MODULES}
                                    formats={QUILL_FORMATS}
                                    placeholder="Outline specific steps, documentation required, and verification process..."
                                    className="bg-transparent border-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                        <button type="submit" className="px-10 py-3.5 bg-bank-teal text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-bank-teal/20 active:scale-95 transition-all">
                            {editingId ? 'Update Procedure' : 'Add to Manual'}
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
