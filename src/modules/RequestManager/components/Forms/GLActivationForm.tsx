import React from 'react';
import { User, FileText, Cpu, Activity } from 'lucide-react';

interface GLActivationFormProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const GLActivationForm: React.FC<GLActivationFormProps> = ({ formData, setFormData }) => {
    const c = formData.contentJson || {};
    const setField = (key: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev,
            contentJson: { ...prev.contentJson, [key]: value }
        }));

    const inputCls = "w-full px-4 py-3 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-navy transition-all text-bank-navy bg-white text-sm";
    const labelCls = "block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5";

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-5 bg-blue-50/30 border-blue-100/50 rounded-2xl border">
                    <h4 className="text-xs font-bold text-bank-navy uppercase mb-4 flex items-center gap-2">
                        <User size={14} /> Ownership Details
                    </h4>
                    <div className="space-y-4">
                        <div>
                            <label className={labelCls}>Ownership Dept with Code *</label>
                            <input className={inputCls} type="text" placeholder="e.g. PLANNING - 9015" value={c.glOwnershipDept || ''} onChange={e => setField('glOwnershipDept', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>Operation Unit/Branch *</label>
                            <input className={inputCls} type="text" placeholder="e.g. 2286 - ballagundu" value={c.glOperationUser || ''} onChange={e => setField('glOperationUser', e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="card p-5 bg-amber-50/30 border-amber-100/50 rounded-2xl border">
                    <h4 className="text-xs font-bold text-bank-navy uppercase mb-4 flex items-center gap-2">
                        <FileText size={14} /> Account Details
                    </h4>
                    <div className="space-y-4">
                        <div>
                            <label className={labelCls}>GL A/C No (FORACID) *</label>
                            <input className={inputCls} type="text" placeholder="Enter Account Number" value={c.glAccountNo || ''} onChange={e => setField('glAccountNo', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>Account Description *</label>
                            <input className={inputCls} type="text" placeholder="e.g. Interest paid on TD" value={c.glAccountDesc || ''} onChange={e => setField('glAccountDesc', e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
                <h4 className="text-xs font-bold text-bank-navy uppercase mb-4 flex items-center gap-2">
                    <Cpu size={14} /> Technical & Operation Parameters
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className={labelCls}>Operation Type*</label>
                        <select className={inputCls} value={c.glOpType || 'System'} onChange={e => setField('glOpType', e.target.value)}>
                            <option value="Manual">Manual</option>
                            <option value="System">System</option>
                            <option value="Both">Both</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Txn Type*</label>
                        <select className={inputCls} value={c.glDrCrBoth || 'Both'} onChange={e => setField('glDrCrBoth', e.target.value)}>
                            <option value="Dr">Debit only</option>
                            <option value="Cr">Credit only</option>
                            <option value="Both">Dr/Cr Both</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Asset/Liability*</label>
                        <select className={inputCls} value={c.glAssetLiability || 'Liability'} onChange={e => setField('glAssetLiability', e.target.value)}>
                            <option value="Asset">Asset</option>
                            <option value="Liability">Liability</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Finacle Mandatory*</label>
                        <select className={inputCls} value={c.glFinacleMandatory || 'Yes'} onChange={e => setField('glFinacleMandatory', e.target.value)}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="card p-6 bg-teal-50/30 border-teal-100/50 rounded-2xl border">
                <h4 className="text-xs font-bold text-bank-navy uppercase mb-4 flex items-center gap-2">
                    <Activity size={14} /> Purpose & Reconciliation
                </h4>
                <div className="space-y-4">
                    <div>
                        <label className={labelCls}>Purpose of Enabling (Fund Flow Details) *</label>
                        <textarea rows={3} className={inputCls} placeholder="Explain why reactivation is needed..." value={c.glPurpose || ''} onChange={e => setField('glPurpose', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Recon Mandate *</label>
                            <select className={inputCls} value={c.glReconMandate || 'Same Day'} onChange={e => setField('glReconMandate', e.target.value)}>
                                <option value="Same Day">Reconciliation by same day</option>
                                <option value="T+1">Recon by T+1 day</option>
                                <option value="T+2">Recon by T+2 days</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>RO delegated power? *</label>
                            <select className={inputCls} value={c.glRoPower || 'No'} onChange={e => setField('glRoPower', e.target.value)}>
                                <option value="No">No</option>
                                <option value="Yes">Yes</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
