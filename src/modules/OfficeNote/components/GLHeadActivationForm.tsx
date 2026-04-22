import React from 'react';
import ReactQuill from 'react-quill-new';
import { SectionCard } from './SectionCard';
import { quillModules } from '../constants';

interface Props {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const GLHeadActivationForm: React.FC<Props> = ({ formData, setFormData }) => {
    const c = formData.contentJson as any;
    const setField = (key: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev,
            contentJson: { ...prev.contentJson, [key]: value }
        }));
    const inputCls = "w-full px-4 py-2 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy bg-white";
    const labelCls = "block text-xs font-bold text-gray-500 uppercase mb-1";

    return (
        <div className="space-y-6">
            <SectionCard title="1. Account / GL Identifiers">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Proposed GL Account Number</label>
                        <input className={inputCls} type="text" placeholder="e.g. 1000000000" value={c.glAccountNo || ''} onChange={e => setField('glAccountNo', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>GL Head Description / Name *</label>
                        <input className={inputCls} type="text" placeholder="e.g. Current Account - General" value={c.glAccountDesc || ''} onChange={e => setField('glAccountDesc', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Ownership Department *</label>
                        <input className={inputCls} type="text" placeholder="e.g. GAD / Accounts" value={c.glOwnershipDept || ''} onChange={e => setField('glOwnershipDept', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Operation End User</label>
                        <input className={inputCls} type="text" placeholder="e.g. Branch Staff / HO User" value={c.glOperationUser || ''} onChange={e => setField('glOperationUser', e.target.value)} />
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="2. Purpose & Technical Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Detailed Purpose for Activation *</label>
                        <ReactQuill theme="snow" value={c.glPurpose} onChange={(val) => setField('glPurpose', val)} modules={quillModules} placeholder="Describe why this GL Head is required..." />
                    </div>
                    <div>
                        <label className={labelCls}>Operation Type *</label>
                        <select className={inputCls} value={c.glOpType || 'System'} onChange={e => setField('glOpType', e.target.value)}>
                            <option value="System">System / Automatic</option>
                            <option value="Manual">Manual</option>
                            <option value="Both">Both</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Debit / Credit / Both *</label>
                        <select className={inputCls} value={c.glDrCrBoth || 'Both'} onChange={e => setField('glDrCrBoth', e.target.value)}>
                            <option value="Debit">Debit Only</option>
                            <option value="Credit">Credit Only</option>
                            <option value="Both">Both Dr/Cr Allowed</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Asset / Liability Class *</label>
                        <select className={inputCls} value={c.glAssetLiability || 'Liability'} onChange={e => setField('glAssetLiability', e.target.value)}>
                            <option value="Liability">Liability</option>
                            <option value="Asset">Asset</option>
                            <option value="Income">Income</option>
                            <option value="Expense">Expense</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Activity Type</label>
                        <input className={inputCls} type="text" placeholder="e.g. Generic / Special" value={c.glActivity || 'Generic'} onChange={e => setField('glActivity', e.target.value)} />
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="3. Controls & Mandates">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Limits Applicable?</label>
                        <select className={inputCls} value={c.glLimits || 'No'} onChange={e => setField('glLimits', e.target.value)}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Monitoring Department</label>
                        <input className={inputCls} type="text" placeholder="e.g. Inspecting / Audit" value={c.glMonitoringDept || ''} onChange={e => setField('glMonitoringDept', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Operation By *</label>
                        <select className={inputCls} value={c.glOperationBy || 'Branch only'} onChange={e => setField('glOperationBy', e.target.value)}>
                            <option value="Branch only">Branch only</option>
                            <option value="RO only">RO only</option>
                            <option value="Both">Both Branch & RO</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Cash Operation Allowed?</label>
                        <select className={inputCls} value={c.glCashOp || 'No'} onChange={e => setField('glCashOp', e.target.value)}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelCls}>Reconciliation Mandate</label>
                        <textarea className={inputCls} rows={2} value={c.glReconMandate || 'Reconciliation to zero by same day'} onChange={e => setField('glReconMandate', e.target.value)} />
                    </div>
                </div>
            </SectionCard>
        </div>
    );
};
