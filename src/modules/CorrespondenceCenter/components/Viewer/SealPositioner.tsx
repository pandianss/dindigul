import React from 'react';
import { Save, X, Move } from 'lucide-react';

interface SealPositionerProps {
    isMovingSeal: boolean;
    setIsMovingSeal: (val: boolean) => void;
    sealPos: { x: number, y: number };
    setSealPos: (pos: { x: number, y: number }) => void;
    handleSaveSealPosition: () => void;
    deptSealUrl?: string;
}

export const SealPositioner: React.FC<SealPositionerProps> = ({
    isMovingSeal,
    setIsMovingSeal,
    sealPos,
    setSealPos,
    handleSaveSealPosition,
    deptSealUrl
}) => {
    if (!deptSealUrl) return null;

    return (
        <div className="absolute top-8 right-8 z-20 flex flex-col items-end space-y-4">
            {isMovingSeal ? (
                <div className="flex items-center space-x-2 bg-white p-2 rounded-xl shadow-2xl border border-bank-navy/10 animate-in slide-in-from-right-4">
                    <div className="flex flex-col items-center px-4 py-2 border-r border-gray-100">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">X Pos</span>
                        <input 
                            type="range" min="-300" max="100" value={sealPos.x} 
                            onChange={(e) => setSealPos({ ...sealPos, x: parseInt(e.target.value) })}
                            className="w-24 accent-bank-navy"
                        />
                    </div>
                    <div className="flex flex-col items-center px-4 py-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Y Pos</span>
                        <input 
                            type="range" min="0" max="600" value={sealPos.y} 
                            onChange={(e) => setSealPos({ ...sealPos, y: parseInt(e.target.value) })}
                            className="w-24 accent-bank-navy h-1"
                        />
                    </div>
                    <button 
                        onClick={handleSaveSealPosition}
                        className="bg-emerald-500 text-white p-3 rounded-lg hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                        title="Save Position"
                    >
                        <Save size={18} />
                    </button>
                    <button 
                        onClick={() => setIsMovingSeal(false)}
                        className="bg-gray-100 text-gray-500 p-3 rounded-lg hover:bg-gray-200 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => setIsMovingSeal(true)}
                    className="group bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white hover:border-bank-navy/20 transition-all flex items-center space-x-3"
                >
                    <div className="w-8 h-8 bg-bank-navy/5 rounded-xl flex items-center justify-center text-bank-navy group-hover:bg-bank-navy group-hover:text-white transition-all">
                        <Move size={16} />
                    </div>
                    <span className="text-[10px] font-black text-bank-navy uppercase tracking-widest pr-2">Reposition Seal</span>
                </button>
            )}
        </div>
    );
};
