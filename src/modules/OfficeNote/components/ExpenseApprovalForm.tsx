import React from 'react';
import ReactQuill from 'react-quill-new';
import { SectionCard } from './SectionCard';
import { quillModules } from '../constants';

interface Props {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const ExpenseApprovalForm: React.FC<Props> = ({ formData, setFormData }) => {
    const c = formData.contentJson as any;
    const setField = (key: string, value: any) =>
        setFormData(prev => ({
            ...prev,
            contentJson: { ...prev.contentJson, [key]: value }
        }));
    const inputCls = "w-full px-4 py-2 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy bg-white";
    const labelCls = "block text-xs font-bold text-gray-500 uppercase mb-1";
    
    return (
        <div className="space-y-6">
            <SectionCard title="1. Expense Categorization & Budget Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Expense Category *</label>
                        <select className={inputCls} value={c.expenseCategory as string} onChange={e => setField('expenseCategory', e.target.value)}>
                            <option value="REVENUE">Revenue Expenditure</option>
                            <option value="CAPITAL">Capital Expenditure</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>General Ledger (GL) Budget Head *</label>
                        <select className={inputCls} value={c.budgetHead as string} onChange={e => setField('budgetHead', e.target.value)}>
                            <option value="">Select or Type Below</option>
                            <option value="Repairs and Maintenance">Repairs and Maintenance</option>
                            <option value="Printing and Stationery">Printing and Stationery</option>
                            <option value="Advertisement and Publicity">Advertisement and Publicity</option>
                            <option value="Travelling Expenses">Travelling Expenses</option>
                            <option value="Legal Charges">Legal Charges</option>
                            <option value="Other Expenditure (Sundries)">Other Expenditure (Sundries)</option>
                        </select>
                        <input type="text" className={`mt-2 ${inputCls}`} placeholder="Or type custom budget head..." value={c.budgetHead as string} onChange={e => setField('budgetHead', e.target.value)} />
                    </div>
                    {c.budgetHead === 'Other Expenditure (Sundries)' && (
                        <>
                            <div>
                                <label className={labelCls}>FY Allocated Budget (₹)</label>
                                <input className={inputCls} type="number" placeholder="Enter Amount" value={c.budgetAllocated as string} onChange={e => setField('budgetAllocated', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls}>Utilised Budget till Date (₹)</label>
                                <input className={inputCls} type="number" placeholder="Enter Amount" value={c.budgetUtilized as string} onChange={e => setField('budgetUtilized', e.target.value)} />
                            </div>
                        </>
                    )}
                </div>
            </SectionCard>
            
            <SectionCard title="2. Proposal & Vendor Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Purpose & Details of Expense</label>
                        <ReactQuill theme="snow" value={c.expensePurpose as string} onChange={(val) => setField('expensePurpose', val)} modules={quillModules} placeholder="Explain why this expense is necessary..." />
                    </div>
                    <div>
                        <label className={labelCls}>Proposed Expenditure Amount (₹) *</label>
                        <input className={inputCls} type="number" required placeholder="Enter Proposed Amount" value={c.proposedAmount as string} onChange={e => setField('proposedAmount', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Quotation Basis *</label>
                        <select className={inputCls} value={c.quotationBasis as string} onChange={e => setField('quotationBasis', e.target.value)}>
                            <option value="L1">L1 out of 3 Quotations</option>
                            <option value="SINGLE">Single Dispensation / Proprietary</option>
                            <option value="EMPANELED">Empaneled Vendor</option>
                            <option value="NA">Not Applicable / Subscription</option>
                        </select>
                    </div>
                    {c.quotationBasis === 'L1' && (
                        <div className="md:col-span-2">
                            <label className={labelCls}>Quotation Details (L1, L2, L3)</label>
                            <textarea rows={2} className={inputCls} placeholder="e.g. L1: Vendor A (₹2000), L2: Vendor B (₹2500)..." value={c.quotationDetails as string} onChange={e => setField('quotationDetails', e.target.value)} />
                        </div>
                    )}
                    <div className="md:col-span-2 border-t pt-2 mt-2">
                        <p className="text-xs font-bold text-bank-teal uppercase mb-2">Selected Vendor Information</p>
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelCls}>Name of Vendor / Beneficiary</label>
                        <input className={inputCls} type="text" placeholder="Vendor Name" value={c.vendorName as string} onChange={e => setField('vendorName', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Vendor PAN</label>
                        <input className={inputCls} type="text" placeholder="ABCDE1234F" value={c.vendorPan as string} onChange={e => setField('vendorPan', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Vendor GSTIN</label>
                        <input className={inputCls} type="text" placeholder="22ABCDE1234F1Z5" value={c.vendorGst as string} onChange={e => setField('vendorGst', e.target.value)} />
                    </div>
                </div>
            </SectionCard>
            
            <SectionCard title="3. Statutory Requirements & Recommendation">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Is TDS Applicable? *</label>
                        <select className={inputCls} value={c.tdsApplicable as string} onChange={e => setField('tdsApplicable', e.target.value)}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Is GST Applicable? *</label>
                        <select className={inputCls} value={c.gstApplicable as string} onChange={e => setField('gstApplicable', e.target.value)}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Specific Recommendation</label>
                        <ReactQuill theme="snow" value={c.recommendation as string} onChange={(val) => setField('recommendation', val)} modules={quillModules} placeholder="Summarize your final recommendation..." />
                    </div>
                </div>
            </SectionCard>
        </div>
    );
};
