import React from 'react';
import { Branch } from '../../types';

interface Step2DistributionProps {
    branches: Branch[];
    formData: any;
    branchTargets: Record<string, number>;
    setBranchTargets: (targets: Record<string, number>) => void;
    typeWeights: Record<string, number>;
    setTypeWeights: (weights: Record<string, number>) => void;
    handleDistributeEqually: () => void;
    handleDistributeByWeight: () => void;
}

export const Step2Distribution: React.FC<Step2DistributionProps> = ({
    branches,
    formData,
    branchTargets,
    setBranchTargets,
    typeWeights,
    setTypeWeights,
    handleDistributeEqually,
    handleDistributeByWeight
}) => {
    return (
        <div className="flex-grow flex flex-col space-y-6 animate-in slide-in-from-right-4 duration-300 overflow-hidden">
            <div className="flex justify-between items-end">
                <div>
                    <h3 className="font-black text-bank-navy text-xl uppercase tracking-tight">Allocate Goals</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Assign targets to individual branches</p>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="text-right mr-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Assigned</p>
                        <p className={`text-lg font-black ${Object.values(branchTargets).reduce((a, b) => a + b, 0) === formData.targetValue ? 'text-bank-teal' : 'text-orange-500'}`}>
                            {Object.values(branchTargets).reduce((a, b) => a + b, 0)} / {formData.targetValue}
                        </p>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button 
                            onClick={handleDistributeEqually}
                            className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white hover:shadow-sm transition-all text-bank-navy"
                        >
                            Equal
                        </button>
                        <button 
                            onClick={handleDistributeByWeight}
                            className="bg-bank-navy text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-bank-navy/10 hover:scale-[1.02] transition-all"
                        >
                            By Weight
                        </button>
                    </div>
                </div>
            </div>

            {/* Weight Configuration */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Branch Type Weights (Urban, Rural, etc.)</p>
                    <div className="h-px flex-grow mx-4 bg-gray-50" />
                </div>
                <div className="flex flex-wrap gap-6">
                    {[...new Set(branches.map(b => b.type))].sort().map(type => (
                        <div key={type} className="flex items-center space-x-3">
                            <span className="text-[10px] font-black text-bank-navy uppercase whitespace-nowrap">{type.replace(/_/g, ' ')}</span>
                            <input 
                                type="number"
                                min="0"
                                step="0.1"
                                value={typeWeights[type] ?? 1}
                                onChange={(e) => setTypeWeights({ ...typeWeights, [type]: parseFloat(e.target.value) || 0 })}
                                className="w-16 bg-gray-50 border border-gray-100 rounded-lg py-1 px-3 text-center font-black text-bank-teal text-xs outline-none focus:bg-white focus:border-bank-teal transition-all"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto pr-4 space-y-3 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                    {branches.map(b => (
                        <div key={b.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-bank-teal/30 hover:shadow-md transition-all">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-[10px] font-black text-bank-navy group-hover:bg-bank-teal group-hover:text-white transition-colors">
                                    {b.code}
                                </div>
                                <div>
                                    <p className="font-black text-bank-navy text-sm uppercase leading-none mb-1">{b.nameEn}</p>
                                    <p className="text-[10px] font-bold text-gray-400 tracking-widest">{b.type.replace(/_/g, ' ')} BRANCH</p>
                                </div>
                            </div>
                            <div className="relative">
                                <input 
                                    type="number"
                                    value={branchTargets[b.id] || 0}
                                    onChange={(e) => setBranchTargets({ ...branchTargets, [b.id]: Number(e.target.value) })}
                                    className="w-32 bg-gray-50 border border-gray-100 rounded-xl py-2 px-4 text-right font-black text-bank-navy focus:bg-white focus:border-bank-teal outline-none transition-all"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
