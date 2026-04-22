import React from 'react';
import { Database, Calendar, Mail, RefreshCw, CheckCircle, Upload } from 'lucide-react';
import { MethodSelector } from './MethodSelector';
import { AmountConfig } from './AmountConfig';
import { TextCustomizer } from './TextCustomizer';
import { Letter } from '../../types';

interface BudgetCenterProps {
    budgetType: string;
    setBudgetType: (val: string) => void;
    financialYear: string;
    setFinancialYear: (val: string) => void;
    emailDate: string;
    setEmailDate: (val: string) => void;
    strategy: 'SIZE_BASED' | 'POPULATION_BASED' | 'UPLOAD_BASED';
    setStrategy: (s: 'SIZE_BASED' | 'POPULATION_BASED' | 'UPLOAD_BASED') => void;
    amounts: Record<string, number>;
    setAmounts: (a: Record<string, number>) => void;
    allotmentFile: File | null;
    setAllotmentFile: (f: File | null) => void;
    specificDirective: string;
    setSpecificDirective: (val: string) => void;
    customIntro: string;
    setCustomIntro: (val: string) => void;
    customOutro: string;
    setCustomOutro: (val: string) => void;
    generating: boolean;
    handleGenerate: () => void;
    handleBulkFreeze: () => void;
    handleBulkZipDownload: () => void;
    letters: Letter[];
}

export const BudgetCenter: React.FC<BudgetCenterProps> = ({
    budgetType, setBudgetType,
    financialYear, setFinancialYear,
    emailDate, setEmailDate,
    strategy, setStrategy,
    amounts, setAmounts,
    allotmentFile, setAllotmentFile,
    specificDirective, setSpecificDirective,
    customIntro, setCustomIntro,
    customOutro, setCustomOutro,
    generating,
    handleGenerate,
    handleBulkFreeze,
    handleBulkZipDownload,
    letters
}) => {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden animate-in slide-in-from-top-4 duration-500">
            <div className="bg-bank-navy p-6 text-white flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="bg-white/10 p-2 rounded-lg">
                        <Database size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Budget Allotment Center</h3>
                        <p className="text-bank-teal/80 text-sm">Automate official allotment letters across the region</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-xl text-sm font-medium">
                    <Calendar size={16} />
                    <span>FY {financialYear}</span>
                </div>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Category & Context */}
                <div className="space-y-6">
                    <div className="group">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">1. Budget Category</label>
                        <input 
                            type="text" 
                            value={budgetType}
                            onChange={(e) => setBudgetType(e.target.value)}
                            className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 font-bold text-bank-navy focus:ring-2 focus:ring-bank-teal/20 focus:bg-white"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Financial Year</label>
                            <input 
                                type="text" 
                                value={financialYear}
                                onChange={(e) => setFinancialYear(e.target.value)}
                                className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 font-bold text-bank-navy"
                            />
                        </div>
                        <div className="group">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Ref. Date</label>
                            <input 
                                type="text" 
                                value={emailDate}
                                onChange={(e) => setEmailDate(e.target.value)}
                                className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 font-bold text-bank-navy"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Method Selection */}
                <MethodSelector strategy={strategy} setStrategy={setStrategy} />

                {/* 3. Amounts & 4. Text Customizer */}
                <div className="space-y-6">
                    <AmountConfig 
                        strategy={strategy}
                        amounts={amounts}
                        setAmounts={setAmounts}
                        allotmentFile={allotmentFile}
                        setAllotmentFile={setAllotmentFile}
                    />
                    <TextCustomizer 
                        specificDirective={specificDirective}
                        setSpecificDirective={setSpecificDirective}
                        customIntro={customIntro}
                        setCustomIntro={setCustomIntro}
                        customOutro={customOutro}
                        setCustomOutro={setCustomOutro}
                    />

                    <button 
                        onClick={handleGenerate}
                        disabled={generating || (strategy === 'UPLOAD_BASED' && !allotmentFile)}
                        className="w-full bg-bank-teal text-white px-6 py-4 rounded-xl font-bold shadow-lg shadow-bank-teal/20 hover:bg-bank-teal/90 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center space-x-3 mt-4"
                    >
                        {generating ? <RefreshCw size={20} className="animate-spin" /> : <Mail size={20} />}
                        <span>{generating ? 'Processing Allotments...' : 'Batch Generate Letters'}</span>
                    </button>

                    {/* Bulk Actions */}
                    {(letters.some(l => l.status === 'DRAFT') || letters.some(l => l.status === 'SENT')) && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Batch Actions</label>
                            <div className="grid grid-cols-2 gap-3">
                                {letters.some(l => l.status === 'DRAFT') && (
                                    <button
                                        onClick={handleBulkFreeze}
                                        disabled={generating}
                                        className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-bank-navy text-white font-bold hover:bg-opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                    >
                                        <CheckCircle size={18} />
                                        <span>Freeze All Drafts</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleBulkZipDownload}
                                    disabled={generating}
                                    className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gray-100 text-bank-navy font-bold hover:bg-gray-200 transition-all shadow-sm active:scale-95 disabled:opacity-50 col-span-2"
                                >
                                    <Upload size={18} className="rotate-180" />
                                    <span>Download Batch (.ZIP)</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
