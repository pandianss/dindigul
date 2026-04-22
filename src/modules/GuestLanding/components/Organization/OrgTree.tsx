import React from 'react';
import { SetupData } from '../../types';
import { LeadershipNode } from './LeadershipNode';
import { BranchGrid } from './BranchGrid';
import { getStaticUrl } from '../../../../services/api';

interface OrgTreeProps {
    setupData: SetupData | null;
}

export const OrgTree: React.FC<OrgTreeProps> = ({ setupData }) => {
    const heads = setupData?.leadership?.filter(l => l.isHead) || [];
    const cms = (setupData?.leadership?.filter(l => !l.isHead) || [])
        .sort((a, b) => a.isSecondLine === b.isSecondLine ? 0 : a.isSecondLine ? -1 : 1);
    
    const districts = Array.from(new Set(setupData?.branchList?.map(b => b.district) || []))
        .map(d => ({
            name: d,
            total: setupData?.branchList?.filter(b => b.district === d).reduce((acc, b) => acc + b.business, 0) || 0,
            branches: setupData?.branchList?.filter(b => b.district === d) || []
        }))
        .sort((a, b) => b.total - a.total);

    return (
        <section id="organization" className="py-20 px-8 bg-white overflow-hidden border-t border-[#D0DCF0]">
            <div className="max-w-7xl mx-auto">
                <div className="mb-16 text-center reveal">
                    <div className="inline-flex items-center gap-2 text-[0.62rem] font-bold tracking-[0.2em] uppercase text-[#0090C8] mb-3">
                        <span className="w-8 h-[2px] bg-[#0090C8]"></span>
                        Governance Hierarchy
                        <span className="w-8 h-[2px] bg-[#0090C8]"></span>
                    </div>
                    <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-black text-[#1B3A6B] tracking-tight leading-tight">
                        Regional Organization Structure
                    </h2>
                </div>

                <div className="relative pt-8 pb-12">
                    <div className="flex flex-col items-center gap-16 relative">
                        {/* VERTICAL CONNECTING LINE - MAIN TRUNK */}
                        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-[#00AEEF] via-[#D0DCF0] to-transparent z-0 opacity-40"></div>

                        {/* LEVEL 0: REGION HEAD */}
                        {heads.map((head, i) => (
                            <div key={i} className="relative z-10 reveal">
                                <div className="max-w-xs flex flex-col items-center">
                                    <LeadershipNode member={head} isMainHead={true} />
                                    
                                    {/* Supplemental for Head if any */}
                                    {setupData?.leadership?.filter(l => l.isSecondLine && l.role === 'RO_MANAGER').map((sec, j) => (
                                        <div key={j} className="mt-4 pt-4 border-t border-gray-100 w-full flex flex-col items-center bg-white/50 rounded-b-lg">
                                            <div className="w-12 h-12 bg-[#F5F7FA] text-[#1B3A6B] rounded-full flex justify-center items-center text-xl font-black mb-2 border-2 border-white shadow-sm overflow-hidden">
                                                {sec.photoUrl ? (
                                                    <img src={getStaticUrl(sec.photoUrl)} alt={sec.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    sec.name.charAt(0)
                                                )}
                                            </div>
                                            <h4 className="text-sm font-bold text-[#1B3A6B] leading-tight">{sec.name}</h4>
                                            <p className="text-[0.55rem] text-[#5A708A] font-bold uppercase tracking-widest">{sec.designation}</p>
                                            <div className="mt-1 text-[0.5rem] font-black text-[#0090C8] uppercase tracking-tighter">2nd Line</div>
                                        </div>
                                    ))}
                                </div>
                                {/* NODE ANCHOR POINT */}
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#00AEEF] rounded-full border-4 border-white shadow-sm"></div>
                            </div>
                        ))}

                        {/* LEVEL 1: SECOND LINE (CMs) & DISTRICTS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-5xl relative">
                            {/* HORIZONTAL CROSSBAR FOR CMs */}
                            <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-[#D0DCF0] -translate-y-8 hidden md:block opacity-40"></div>

                            {cms.map((cm, i) => {
                                const dGroup = districts[i];
                                return (
                                    <div key={i} className="flex flex-col items-center relative reveal">
                                        {/* VERTICAL LINE FROM CROSSBAR */}
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-[#D0DCF0] -translate-y-8 hidden md:block opacity-40"></div>
                                        
                                        <div className="w-64 z-10">
                                            <LeadershipNode member={cm} />
                                        </div>

                                        {/* DISTRICT NODE UNDER EACH CM */}
                                        {dGroup && (
                                            <div className="w-full relative">
                                                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-[#D0DCF0] translate-y-16 opacity-20"></div>
                                                <BranchGrid 
                                                    branches={dGroup.branches}
                                                    districtName={dGroup.name}
                                                    districtTotal={dGroup.total}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
