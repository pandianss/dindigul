import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { cn } from '../../../../utils/cn';

interface WizardOrchestratorProps {
    currentStep: number;
    setCurrentStep: (s: number | ((prev: number) => number)) => void;
    onClose: () => void;
    onSave: () => void;
    isValid: boolean;
    children: React.ReactNode;
}

export const WizardOrchestrator: React.FC<WizardOrchestratorProps> = ({
    currentStep,
    setCurrentStep,
    onClose,
    onSave,
    isValid,
    children
}) => {
    const steps = [1, 2, 3, 4, 5];

    return (
        <div className="flex flex-col h-full bg-[#f8fafc]">
            {/* Wizard Progress Header */}
            <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-6">
                    <button 
                        type="button"
                        onClick={onClose} 
                        className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-red-500"
                    >
                        <X size={20} />
                    </button>
                    <div className="h-10 w-px bg-gray-100" />
                    <div className="flex items-center gap-4">
                        {steps.map(s => (
                            <div key={s} className="flex items-center gap-2">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-all",
                                    currentStep === s ? "bg-bank-navy text-white shadow-lg scale-110 ring-4 ring-bank-navy/10" : 
                                    currentStep > s ? "bg-bank-teal text-white" : "bg-gray-100 text-gray-400"
                                )}>
                                    {currentStep > s ? <ShieldCheck size={14} /> : s}
                                </div>
                                {s < 5 && <div className="w-8 h-0.5 bg-gray-100" />}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {currentStep > 1 && (
                        <button 
                            type="button"
                            onClick={() => setCurrentStep(prev => prev - 1)}
                            className="px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
                        >
                            Back
                        </button>
                    )}
                    {currentStep < 5 ? (
                        <button 
                            type="button"
                            onClick={() => setCurrentStep(prev => prev + 1)}
                            className="px-8 py-3 bg-bank-navy text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-bank-teal transition-all shadow-xl shadow-bank-navy/20 active:scale-95"
                        >
                            Next Component
                        </button>
                    ) : (
                    <div className="flex flex-col items-end">
                        <button 
                            type="button"
                            onClick={onSave}
                            disabled={!isValid}
                            className={cn(
                                "px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95",
                                isValid 
                                    ? "bg-bank-teal text-white shadow-bank-teal/20 hover:bg-bank-navy" 
                                    : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                            )}
                        >
                            Save & Finalize PDF
                        </button>
                        {!isValid && (
                            <span className="text-[10px] text-red-400 mt-2 font-bold uppercase tracking-tighter">
                                Requires Minutes & 1 Signatory
                            </span>
                        )}
                    </div>
                    )}
                </div>
            </div>

            {/* Wizard Content Area */}
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};
