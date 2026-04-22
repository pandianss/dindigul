import React from 'react';
import ReactQuill from 'react-quill-new';
import { SectionCard } from './SectionCard';
import { quillModules } from '../constants';

interface Props {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const ReversalChargesForm: React.FC<Props> = ({ formData, setFormData }) => {
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
            <SectionCard title="1. Account / Customer Details">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={labelCls}>Customer Name *</label>
                        <input className={inputCls} type="text" placeholder="e.g. John Doe" value={c.revCustomerName || ''} onChange={e => setField('revCustomerName', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Account Number *</label>
                        <input className={inputCls} type="text" placeholder="e.g. 123456789012" value={c.revAccountNumber || ''} onChange={e => setField('revAccountNumber', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>CIF ID / Customer ID *</label>
                        <input className={inputCls} type="text" placeholder="e.g. CIF1234567" value={c.revCifId || ''} onChange={e => setField('revCifId', e.target.value)} />
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="2. Original Charge Details">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={labelCls}>Charge Type *</label>
                        <select className={inputCls} value={c.revChargeType || 'SMS Charges'} onChange={e => setField('revChargeType', e.target.value)}>
                            <option value="SMS Charges">SMS Charges</option>
                            <option value="LRS (Ledger Folio)">LRS (Ledger Folio)</option>
                            <option value="AMC Charges">AMC (Annual Maintenance)</option>
                            <option value="Cheque Return">Cheque Return (Bounce)</option>
                            <option value="Stop Payment">Stop Payment / Hotlisting</option>
                            <option value="Processing Fee">Processing Fee</option>
                            <option value="Penalty Interest">Penalty Interest</option>
                            <option value="Other">Other Charges</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Date of Original Charge *</label>
                        <input className={inputCls} type="date" value={c.revOriginalChargeDate || ''} onChange={e => setField('revOriginalChargeDate', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Original Amount Charged (₹) *</label>
                        <input className={inputCls} type="number" step="0.01" placeholder="e.g. 177.00" value={c.revOriginalChargeAmount || ''} onChange={e => setField('revOriginalChargeAmount', e.target.value)} />
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="3. Reversal Justification">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Amount to be Reversed (₹) *</label>
                        <input className={inputCls} type="number" step="0.01" placeholder="e.g. 177.00" value={c.revReversalAmount || ''} onChange={e => setField('revReversalAmount', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Reason for Reversal *</label>
                        <select className={inputCls} value={c.revReason || 'Bank Error'} onChange={e => setField('revReason', e.target.value)}>
                            <option value="Bank Error">Bank Error / Staff Mistake</option>
                            <option value="System Error">System Glitch / Technical Error</option>
                            <option value="Customer Request (First Time)">Customer Request (First Time Waiver)</option>
                            <option value="Customer Goodwill">Customer Relationship / Goodwill</option>
                            <option value="Fee Waiver Approved by RO">Fee Waiver (As per RO Sanction)</option>
                            <option value="Other">Other Justification</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelCls}>Detailed Justification / Narrative *</label>
                        <ReactQuill theme="snow" value={c.revJustification} onChange={(val) => setField('revJustification', val)} modules={quillModules} placeholder="Provide detailed background for this reversal request..." />
                    </div>
                </div>
            </SectionCard>
        </div>
    );
};
