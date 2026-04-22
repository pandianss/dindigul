import React from 'react';
import { AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { MisException } from '../types';

interface ExceptionMatrixProps {
    show: boolean;
    onClose: () => void;
    exceptions: MisException[];
}

export const ExceptionMatrix: React.FC<ExceptionMatrixProps> = ({
    show,
    onClose,
    exceptions
}) => {
    if (!show) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-300"
                onClick={onClose}
            />
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-500 flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-bank-navy flex items-center gap-2 uppercase tracking-tight">
                        <AlertCircle className="text-amber-500 w-5 h-5" />
                        Exception Matrix
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {exceptions.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                            <CheckCircle2 className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
                            <p className="text-slate-400 font-extrabold text-xs uppercase tracking-widest">Parameters Optimal</p>
                        </div>
                    ) : (
                        exceptions.map(ex => (
                            <div key={ex.id} className={`p-5 rounded-2xl border-l-8 shadow-sm transition-all hover:shadow-md ${ex.severity === 'CRITICAL' ? 'bg-red-50 border-red-500' : ex.severity === 'HIGH' ? 'bg-orange-50 border-orange-500' : 'bg-slate-50 border-slate-400'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{ex.type}</span>
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${ex.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' : ex.severity === 'HIGH' ? 'bg-orange-200 text-orange-800' : 'bg-slate-200 text-slate-700'}`}>{ex.severity}</span>
                                </div>
                                <p className="text-sm font-black text-slate-800 mb-2 tracking-tight">{ex.parameter.replace(/_/g, ' ')}</p>
                                <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">{ex.message}</p>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50/30">
                    <button
                        onClick={onClose}
                        className="w-full bg-bank-navy text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </>
    );
};
