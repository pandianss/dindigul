import React from 'react';
import { getStaticUrl } from '../../../../services/api';
import { Branch } from '../../types';

interface BranchGridProps {
    branches: Branch[];
    districtName: string;
    districtTotal: number;
}

export const BranchGrid: React.FC<BranchGridProps> = ({ 
    branches, 
    districtName, 
    districtTotal 
}) => {
    return (
        <div className="mt-12 w-full">
            <div className="flex flex-col items-center">
                <div className="px-5 py-2 bg-[#E0F4FB] border border-[#0090C8]/20 rounded-md mb-6 z-10 text-center">
                    <div className="text-[0.65rem] font-black text-[#0090C8] uppercase tracking-[0.15em]">
                        {districtName} District
                    </div>
                    <div className="text-[0.55rem] font-bold text-[#5A708A]">
                        {branches.length} Branches · ₹{Math.round(districtTotal).toLocaleString()} Cr
                    </div>
                </div>

                {/* BRANCHES SUBTREE (Scrollable Grid) */}
                <div className="w-full bg-[#EAEEF4]/40 border border-[#D0DCF0] rounded-lg p-5 max-h-[400px] overflow-y-auto custom-scrollbar z-10 shadow-inner">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {branches.map((br, idx) => (
                            <div key={idx} className="bg-white p-3 rounded border border-[#D0DCF0]/60 flex flex-col gap-3 group hover:border-[#00AEEF]/40 transition-colors shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <span className="text-[0.7rem] font-bold text-[#1B3A6B] group-hover:text-[#00AEEF] transition-colors">{br.nameEn}</span>
                                        <span className="text-[0.55rem] text-[#5A708A] font-medium tracking-wider uppercase">SOL {br.code}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[0.8rem] font-black text-[#1B3A6B]">₹{br.business.toLocaleString()} <span className="text-[0.6rem] font-bold text-[#1B3A6B]/60 ml-0.5">Cr</span></div>
                                        <div className="text-[0.5rem] font-bold text-[#0090C8] uppercase tracking-tighter">Business</div>
                                    </div>
                                </div>
                                
                                {/* BRANCH LEADERSHIP MINI PROFILES */}
                                <div className="flex flex-col gap-2 pt-2 border-t border-[#D0DCF0]/40 mt-auto">
                                    {/* 1st Line */}
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-[#1B3A6B]/5 border border-[#1B3A6B]/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                            {br.headPhotoUrl ? (
                                                <img src={getStaticUrl(br.headPhotoUrl)} alt={br.headName} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[0.5rem] font-bold text-[#1B3A6B]/40">{(br.headName || 'B').charAt(0)}</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[0.58rem] font-black text-[#1B3A6B] truncate uppercase tracking-tighter">{br.headName || 'Branch Head'}</span>
                                                <span className="text-[0.4rem] font-black bg-[#1B3A6B] text-white px-1 rounded-sm">I</span>
                                            </div>
                                            <span className="text-[0.45rem] font-bold text-[#0090C8] uppercase tracking-[0.1em] truncate">
                                                {(br.headDesignation || 'Branch Head').replace(/\s*-\s*I\s*line$/i, '').trim()}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* 2nd Line */}
                                    {br.secondLineName && (
                                        <div className="flex items-center gap-2 pt-1.5 border-t border-[#D0DCF0]/40">
                                            <div className="w-6 h-6 rounded-full bg-[#5A708A]/5 border border-[#5A708A]/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                {br.secondLinePhotoUrl ? (
                                                    <img src={getStaticUrl(br.secondLinePhotoUrl)} alt={br.secondLineName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-[0.5rem] font-bold text-[#5A708A]/40">{(br.secondLineName || 'O').charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[0.58rem] font-black text-[#5A708A] truncate uppercase tracking-tighter">{br.secondLineName}</span>
                                                    <span className="text-[0.4rem] font-black bg-[#5A708A] text-white px-1 rounded-sm">II</span>
                                                </div>
                                                <span className="text-[0.45rem] font-bold text-[#5A708A]/80 uppercase tracking-[0.1em] truncate">
                                                    {(br.secondLineDesignation || 'Officer').replace(/\s*-\s*II\s*line$/i, '').trim()}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
