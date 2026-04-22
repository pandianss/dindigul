import React from 'react';
import ReactQuill from 'react-quill-new';
import { FileText, IndianRupee, Hash, Plus, Trash2 } from 'lucide-react';
import { CustomDatePicker } from '../../../components/CustomDatePicker';
import { formatLocalISO, parseLocalISO } from '../../../utils/dateUtils';
import { quillModules } from '../constants';

interface Props {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const HighValueDDForm: React.FC<Props> = ({ formData, setFormData }) => {
    const c = formData.contentJson as any;
    const setField = (key: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev,
            contentJson: { ...prev.contentJson, [key]: value }
        }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-bank-teal/5 rounded-2xl border border-bank-teal/20">
            <div className="md:col-span-3">
                <h4 className="text-bank-navy font-bold text-sm uppercase tracking-wider border-b border-bank-teal/20 pb-2 mb-4 flex items-center">
                    <FileText className="mr-2 text-bank-teal" size={18} />
                    High Value DD - Required Parameters
                </h4>
            </div>

            {/* Branch Information */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Branch SOL ID</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal font-mono font-bold" maxLength={4} placeholder="XXXX"
                    value={c.branchSol || ''} onChange={(e) => setField('branchSol', e.target.value)} />
            </div>
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Grade of Branch head (Auto)</label>
                <input type="text" readOnly className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-400 font-bold outline-none" 
                    value={c.branchHeadGrade || ''} placeholder="Auto-populated after SOL" />
            </div>
            
            {/* Applicant Section */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name of the applicant</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-red-400" 
                    value={c.applicantName || ''} onChange={(e) => setField('applicantName', e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account number</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                    value={c.applicantAccount || ''} onChange={(e) => setField('applicantAccount', e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Compliance of KYC norms</label>
                <select className="w-full px-4 py-2 border rounded-lg outline-none focus:border-red-400 bg-white" 
                    value={c.kycCompliance || 'Yes'} onChange={(e) => setField('kycCompliance', e.target.value)}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </select>
            </div>

            {/* Issue Details */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date of Issue</label>
                <CustomDatePicker
                    selected={parseLocalISO(c.dateOfIssue)}
                    onChange={(d: Date | null) => setField('dateOfIssue', formatLocalISO(d))}
                    className="w-full px-4 py-2 border rounded-lg outline-none focus:border-red-400 font-bold text-bank-navy"
                />
            </div>

            {/* Beneficiary Section */}
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name of Beneficiary</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                    value={c.beneficiaryName || ''} onChange={(e) => setField('beneficiaryName', e.target.value)} />
            </div>
            
            {/* Branch Fields */}
            <div>
                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Issuing Branch</label>
                 <input
                     type="text"
                     className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy font-bold bg-gray-50/50 cursor-not-allowed"
                     value={c.issuingBranch || ''}
                     readOnly
                 />
             </div>
             <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">DD Drawn on</label>
                 <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-red-400" 
                     placeholder="Enter payable branch name"
                     value={c.ddDrawnOn || ''} onChange={(e) => setField('ddDrawnOn', e.target.value)} />
             </div>

            {/* DD Details */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount of DD (₹)</label>
                <input type="number" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-red-400" 
                    value={c.amount || ''} onChange={(e) => setField('amount', e.target.value)} />
            </div>

            {/* Transaction / Purpose */}
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Transaction ID</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                    value={c.transactionId || ''} onChange={(e) => setField('transactionId', e.target.value)} />
            </div>
            <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Purpose of transaction</label>
                <ReactQuill theme="snow" value={c.purpose || ''} onChange={(val) => setField('purpose', val)} modules={quillModules} placeholder="State the purpose clearly..." />
            </div>

            {/* Policy Circular References */}
            <div className="md:col-span-3 mt-4">
                <div className="flex items-center justify-between mb-4 border-b border-bank-teal/20 pb-2">
                    <h4 className="text-bank-navy font-bold text-sm uppercase tracking-wider flex items-center">
                        <Hash className="mr-2 text-bank-teal" size={16} />
                        Policy Circular References
                    </h4>
                    <button
                        type="button"
                        onClick={() => {
                            const newCirculars = [...(c.policyCirculars || [])];
                            newCirculars.push({ dept: '', date: '', ref: '' });
                            setField('policyCirculars', newCirculars);
                        }}
                        className="flex items-center space-x-1 px-3 py-1 bg-bank-teal text-white rounded hover:bg-opacity-90 transition-all text-[10px] font-bold uppercase"
                    >
                        <Plus size={12} />
                        <span>Add Circular</span>
                    </button>
                </div>

                <div className="space-y-4">
                    {(c.policyCirculars || []).map((circular: any, index: number) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-white rounded-xl border border-bank-teal/10 relative group">
                            {index > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newCirculars = [...c.policyCirculars];
                                        newCirculars.splice(index, 1);
                                        setField('policyCirculars', newCirculars);
                                    }}
                                    className="absolute -right-2 -top-2 p-1 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-all opacity-0 group-hover:opacity-100 border border-red-100"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Issuing Department</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-bank-teal text-xs"
                                    placeholder="e.g. Central Office, GAD"
                                    value={circular.dept}
                                    onChange={(e) => {
                                        const newCirculars = [...c.policyCirculars];
                                        newCirculars[index].dept = e.target.value;
                                        setField('policyCirculars', newCirculars);
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Circular Date</label>
                                <CustomDatePicker
                                    selected={parseLocalISO(circular.date)}
                                    onChange={(d: Date | null) => {
                                        const newCirculars = [...c.policyCirculars];
                                        newCirculars[index].date = formatLocalISO(d);
                                        setField('policyCirculars', newCirculars);
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-bank-teal text-xs font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Circular Reference</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-bank-teal text-xs"
                                    placeholder="e.g. 1/2023-24"
                                    value={circular.ref}
                                    onChange={(e) => {
                                        const newCirculars = [...c.policyCirculars];
                                        newCirculars[index].ref = e.target.value;
                                        setField('policyCirculars', newCirculars);
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
