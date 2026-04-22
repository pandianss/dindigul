import React from 'react';
import { ECONOMY_SECTORS } from '../../constants';

export const SectorsGrid: React.FC = () => {
    return (
        <section id="economy" className="py-16 px-8 bg-white">
            <div className="max-w-6xl mx-auto">
                <div className="mb-10 reveal">
                    <div className="inline-flex items-center gap-2 text-[0.62rem] font-bold tracking-[0.18em] uppercase text-[#0090C8] mb-2 before:content-[''] before:block before:w-5 before:h-[2px] before:bg-[#0090C8]">
                        Economic Sectors
                    </div>
                    <h2 className="text-[clamp(1.4rem,2.5vw,2rem)] font-extrabold text-[#1B3A6B] tracking-[-0.02em] leading-[1.2] mb-2.5">
                        Engines of Commerce & Production
                    </h2>
                    <p className="text-[0.92rem] text-[#5A708A] max-w-[680px] leading-[1.8]">
                        A remarkably diversified economic canvas — from GI-tagged lock manufacturing and international leather exports to Asia-class cardamom markets and hydropower generation.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {ECONOMY_SECTORS.map((p, i) => (
                        <div key={i} className="bg-white border border-[#D0DCF0] p-7 pt-8 relative transition-all duration-250 hover:-translate-y-1 hover:shadow-lg reveal before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1" style={{ '--tw-before-bg': p.c } as any}>
                            <div style={{ backgroundColor: p.c }} className="absolute top-0 left-0 right-0 h-1"></div>
                            <div className="w-10 h-10 bg-[#F5F7FA] border border-[#D0DCF0] rounded-sm flex items-center justify-center text-xl mb-4">
                                {p.i}
                            </div>
                            <div className="text-[0.92rem] font-bold text-[#1B3A6B] mb-1">{p.t}</div>
                            <div className={`inline-block text-[0.57rem] font-bold tracking-[0.1em] uppercase px-2 py-0.5 mb-3 border rounded-sm ${p.gt ? 'text-[#C8970A] bg-[#FEF9EC] border-[#C8970A]/20' : 'text-[#0090C8] bg-[#E0F4FB] border-[#0090C8]/20'}`}>
                                {p.tag}
                            </div>
                            <p className="text-[0.8rem] text-[#5A708A] leading-[1.65]">
                                {p.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
