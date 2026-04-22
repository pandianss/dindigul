import React from 'react';
import { Globe, ChevronDown, parse, format } from 'lucide-react';
import { CustomDatePicker } from '../../../../components/CustomDatePicker';
import { Branch, Signatory, LetterForm, Template } from '../../types';
import { parse as parseDate, format as formatDate } from 'date-fns';

interface ConfigSidebarProps {
    formData: LetterForm;
    setFormData: (d: LetterForm | ((prev: LetterForm) => LetterForm)) => void;
    branches: Branch[];
    signatories: Signatory[];
    templates: Template[];
    selectedBranchId: string;
    setSelectedBranchId: (id: string) => void;
    selectedSignatoryId: string;
    setSelectedSignatoryId: (id: string) => void;
    onApplyTemplate: (tpl: Template) => void;
    loading: boolean;
}

export const ConfigSidebar: React.FC<ConfigSidebarProps> = ({
    formData,
    setFormData,
    branches,
    signatories,
    templates,
    selectedBranchId,
    setSelectedBranchId,
    selectedSignatoryId,
    setSelectedSignatoryId,
    onApplyTemplate,
    loading
}) => {
    return (
        <div className="w-full md:w-80 bg-gray-50 border-r border-gray-100 p-6 overflow-y-auto space-y-6">
            {!formData.isExternal ? (
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Recipient Branch</label>
                    <select
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-bank-navy focus:ring-2 focus:ring-bank-navy/10 focus:border-bank-navy transition-all outline-none"
                    >
                        <option value="">{loading ? 'Loading Branches...' : 'Select Branch...'}</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.code} - {b.nameEn}</option>
                        ))}
                    </select>
                </div>
            ) : (
                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Globe size={12} />
                        External Correspondence
                    </p>
                    <p className="text-[10px] text-amber-600 leading-tight">This letter will be addressed to an external authority but filed internally.</p>
                </div>
            )}

            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block font-black">Letter Period</label>
                <CustomDatePicker
                    selected={(() => {
                        try {
                            return parseDate(formData.period, 'MMM yyyy', new Date());
                        } catch (e) {
                            return new Date();
                        }
                    })()}
                    onChange={(date) => setFormData(prev => ({ 
                        ...prev, 
                        period: date ? formatDate(date, 'MMM yyyy') : formatDate(new Date(), 'MMM yyyy') 
                    }))}
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
                        className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-bank-navy focus:ring-2 focus:ring-bank-navy/10 focus:border-bank-navy transition-all appearance-none outline-none"
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
                <div className="space-y-4 pt-4 border-t border-gray-100">
                    <div>
                        <label className="text-[10px] font-black text-bank-teal uppercase mb-2 block tracking-widest">External Recipient</label>
                        <input
                            type="text"
                            placeholder="e.g., Police Commissioner"
                            value={formData.recipientName}
                            onChange={(e) => setFormData(p => ({ ...p, recipientName: e.target.value }))}
                            className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs font-bold text-bank-navy focus:border-bank-teal outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">To Address</label>
                        <textarea
                            placeholder="Full address of the recipient..."
                            rows={3}
                            value={formData.recipientAddress}
                            onChange={(e) => setFormData(p => ({ ...p, recipientAddress: e.target.value }))}
                            className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs font-bold text-bank-navy focus:border-bank-teal outline-none resize-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Associated Branch</label>
                        <select
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs font-bold text-bank-navy focus:ring-2 focus:ring-bank-navy/10 focus:border-bank-navy transition-all outline-none"
                        >
                            <option value="">Select Branch (Optional)...</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.code} - {b.nameEn}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            <div className="pt-4 border-t border-gray-200">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 block">Quick Templates</label>
                <div className="space-y-2">
                    {templates.map(tpl => (
                        <button
                            key={tpl.id}
                            onClick={() => onApplyTemplate(tpl)}
                            className="w-full text-left p-2.5 rounded-lg border border-gray-200 bg-white hover:border-bank-navy hover:shadow-sm transition-all text-xs group"
                        >
                            <p className="font-bold text-bank-navy line-clamp-1 group-hover:text-bank-teal transition-colors">{tpl.name}</p>
                            <p className="text-gray-400 text-[10px] truncate">{tpl.subjectEn}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
