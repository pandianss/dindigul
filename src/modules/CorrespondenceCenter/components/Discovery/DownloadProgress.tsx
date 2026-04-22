import React from 'react';
import { Download, Loader2, X, CheckCircle, Package } from 'lucide-react';

interface DownloadProgressProps {
    current: number;
    total: number;
    status: 'IDLE' | 'GENERATING' | 'ZIPPING' | 'COMPLETED' | 'ERROR';
    onClose: () => void;
}

export const DownloadProgress: React.FC<DownloadProgressProps> = ({ current, total, status, onClose }) => {
    if (status === 'IDLE') return null;

    const progress = total > 0 ? Math.round((current / total) * 100) : 0;
    const isProcessing = status === 'GENERATING' || status === 'ZIPPING';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-bank-navy/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-bank-navy/5 text-bank-navy'}`}>
                                {status === 'COMPLETED' ? <CheckCircle size={24} /> : <Download size={24} />}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-bank-navy tracking-tight">
                                    {status === 'GENERATING' ? 'Preparing Batch' : 
                                     status === 'ZIPPING' ? 'Finalizing ZIP' : 
                                     status === 'COMPLETED' ? 'Download Ready' : 
                                     status === 'ERROR' ? 'Download Failed' : 'Initializing'}
                                </h3>
                                <p className="text-sm text-gray-500 font-medium">Batch Download Service</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {isProcessing && (
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm font-black uppercase tracking-widest leading-none">
                                    <span className="text-gray-400">
                                        {status === 'ZIPPING' ? 'Compression' : `Letter ${current} of ${total}`}
                                    </span>
                                    <span className={status === 'ZIPPING' ? 'text-amber-500' : 'text-bank-navy'}>
                                        {status === 'ZIPPING' ? 'Final Phase' : `${progress}%`}
                                    </span>
                                </div>
                                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-500 ease-out ${status === 'ZIPPING' ? 'bg-amber-400 animate-pulse' : 'bg-bank-navy'}`}
                                        style={{ width: status === 'ZIPPING' ? '100%' : `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {status === 'COMPLETED' && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-4">
                                <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20">
                                    <Package size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-emerald-900 leading-tight">Bundle successfully generated.</p>
                                    <p className="text-xs text-emerald-600 mt-1">The ZIP file has been sent to your browser.</p>
                                </div>
                            </div>
                        )}

                        {status === 'ERROR' && (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                                <p className="text-sm font-bold text-rose-900">An error occurred while generating the PDFs.</p>
                                <p className="text-xs text-rose-500 mt-1">Please try again or download individual letters.</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <button 
                                onClick={onClose}
                                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                    status === 'COMPLETED' 
                                    ? 'bg-bank-navy text-white hover:bg-opacity-90 shadow-lg' 
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                            >
                                {status === 'COMPLETED' ? 'Close' : 'Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
