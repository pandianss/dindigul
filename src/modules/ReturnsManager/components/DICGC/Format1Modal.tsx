import React from 'react';
import { X } from 'lucide-react';
import { DicgcReturnData } from '../../types';

interface Format1ModalProps {
    data: DicgcReturnData;
    setData: (d: DicgcReturnData | ((prev: DicgcReturnData) => DicgcReturnData)) => void;
    onClose: () => void;
    onSync: () => void;
    isFrozen: boolean;
}

export const Format1Modal: React.FC<Format1ModalProps> = ({
    data,
    setData,
    onClose,
    onSync,
    isFrozen
}) => {
    const totalFormat1 = Object.values(data.format1).reduce((a, b) => a + b, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-xl">FORMAT-1 breakdown</h3>
                        <p className="text-[10px] opacity-40 uppercase tracking-widest">Sundry Creditors (In Rs.) {isFrozen && "(Read Only)"}</p>
                    </div>
                    <button type="button" onClick={onClose}>
                        <X />
                    </button>
                </div>
                <div className="p-10 grid grid-cols-2 gap-5 overflow-y-auto max-h-[60vh]">
                    {Object.keys(data.format1).map(k => (
                        <div key={k} className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                                {k.replace(/([A-Z])/g, ' $1')}
                            </label>
                            <input 
                                type="number" 
                                readOnly={isFrozen} 
                                value={(data.format1 as any)[k] || ''} 
                                onChange={(e) => setData(p => ({
                                    ...p,
                                    format1: { ...p.format1, [k]: parseFloat(e.target.value) || 0 }
                                }))} 
                                className="w-full bg-slate-50 h-12 rounded-xl px-4 font-bold text-slate-700 text-sm border-none ring-1 ring-slate-100 disabled:opacity-50 outline-none focus:ring-4 focus:ring-indigo-50" 
                            />
                        </div>
                    ))}
                </div>
                <div className="p-8 bg-slate-50 border-t flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 italic">
                            Total: ₹{totalFormat1.toLocaleString('en-IN')}
                        </p>
                    </div>
                    <button 
                        type="button"
                        onClick={onSync} 
                        disabled={isFrozen} 
                        className="bg-indigo-600 text-white px-8 h-12 rounded-2xl font-black disabled:bg-slate-200 disabled:text-slate-400 hover:bg-indigo-700 transition-colors shadow-lg active:scale-95"
                    >
                        Sync with DI-01
                    </button>
                </div>
            </div>
        </div>
    );
};
