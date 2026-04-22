import React from 'react';

export const OverviewSection: React.FC = () => {
    return (
        <section id="overview" className="py-16 px-8 bg-[#F5F7FA]">
            <div className="max-w-6xl mx-auto">
                <div className="mb-10 reveal">
                    <div className="inline-flex items-center gap-2 text-[0.62rem] font-bold tracking-[0.18em] uppercase text-[#0090C8] mb-2 before:content-[''] before:block before:w-5 before:h-[2px] before:bg-[#0090C8]">
                        District Overview
                    </div>
                    <h2 className="text-[clamp(1.4rem,2.5vw,2rem)] font-extrabold text-[#1B3A6B] tracking-[-0.02em] leading-[1.2] mb-2.5">
                        The Gateway to Southern Prosperity
                    </h2>
                    <p className="text-[0.92rem] text-[#5A708A] max-w-[680px] leading-[1.8]">
                        Dindigul and Theni districts form a unique economic corridor in Tamil Nadu, seamlessly blending centuries-old manufacturing traditions with modern horticultural excellence and renewable energy leadership.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                    {/* Dindigul Card */}
                    <div className="bg-white border border-[#D0DCF0] border-t-4 border-t-[#1B3A6B] p-8 reveal shadow-sm hover:shadow-md transition-shadow">
                        <span className="float-right mt-1 bg-[#E0F4FB] text-[#0090C8] text-[0.58rem] font-bold tracking-[0.1em] uppercase px-2 py-1 border border-[#0090C8]/20 rounded-sm">
                            Dindigul RO
                        </span>
                        <div className="text-[1.3rem] font-extrabold text-[#1B3A6B] tracking-[-0.02em]">Dindigul District</div>
                        <div className="text-[0.68rem] text-[#5A708A] mt-0.5 mb-3">Headquarters: Dindigul City &nbsp;|&nbsp; Est. 1985</div>
                        <p className="text-[0.85rem] text-[#5A708A] leading-[1.7] mb-5 pb-5 border-b border-[#D0DCF0] clear-both">
                            Spanning 7,184 km² across the Palani Hills and southern plains, Dindigul bridges the Madurai–Coimbatore trade corridor. Famed as India's lock manufacturing capital with a GI Tag, it also hosts significant tanneries, granite quarrying, and cotton textile clusters.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-[#F5F7FA] border-l-4 border-[#D0DCF0] rounded-r-sm">
                                <div className="text-[1.1rem] font-extrabold text-[#1B3A6B] tracking-[-0.02em]">38.3L</div>
                                <div className="text-[0.6rem] font-bold text-[#5A708A] uppercase tracking-[0.06em] mt-0.5">Population (2011)</div>
                            </div>
                            <div className="p-3 bg-[#F5F7FA] border-l-4 border-[#D0DCF0] rounded-r-sm">
                                <div className="text-[1.1rem] font-extrabold text-[#1B3A6B] tracking-[-0.02em]">7,184 <span className="text-[0.8rem] font-normal">km²</span></div>
                                <div className="text-[0.6rem] font-bold text-[#5A708A] uppercase tracking-[0.06em] mt-0.5">Area</div>
                            </div>
                            <div className="p-3 bg-[#F5F7FA] border-l-4 border-[#D0DCF0] rounded-r-sm">
                                <div className="text-[1.1rem] font-extrabold text-[#1B3A6B] tracking-[-0.02em]">77.2%</div>
                                <div className="text-[0.6rem] font-bold text-[#5A708A] uppercase tracking-[0.06em] mt-0.5">Literacy Rate</div>
                            </div>
                            <div className="p-3 bg-[#F5F7FA] border-l-4 border-[#D0DCF0] rounded-r-sm">
                                <div className="text-[1.1rem] font-extrabold text-[#1B3A6B] tracking-[-0.02em]">14</div>
                                <div className="text-[0.6rem] font-bold text-[#5A708A] uppercase tracking-[0.06em] mt-0.5">Revenue Taluks</div>
                            </div>
                        </div>
                    </div>

                    {/* Theni Card */}
                    <div className="bg-white border border-[#D0DCF0] border-t-4 border-t-[#0090C8] p-8 reveal shadow-sm hover:shadow-md transition-shadow">
                        <span className="float-right mt-1 bg-[#E0F4FB] text-[#0090C8] text-[0.58rem] font-bold tracking-[0.1em] uppercase px-2 py-1 border border-[#0090C8]/20 rounded-sm">
                            Sub-Region
                        </span>
                        <div className="text-[1.3rem] font-extrabold text-[#1B3A6B] tracking-[-0.02em]">Theni District</div>
                        <div className="text-[0.68rem] text-[#5A708A] mt-0.5 mb-3">Headquarters: Theni Town &nbsp;|&nbsp; Est. 1996</div>
                        <p className="text-[0.85rem] text-[#5A708A] leading-[1.7] mb-5 pb-5 border-b border-[#D0DCF0] clear-both">
                            Carved from Madurai and Periyar districts in 1996, Theni spans 2,997 km² along the Western Ghats border with Kerala. Renowned as Asia's second-largest cardamom market (Bodinayakanur), the "Grape City of South India" (Cumbum Valley), and a prolific banana-producing belt.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-[#F5F7FA] border-l-4 border-[#D0DCF0] rounded-r-sm">
                                <div className="text-[1.1rem] font-extrabold text-[#1B3A6B] tracking-[-0.02em]">12.5L</div>
                                <div className="text-[0.6rem] font-bold text-[#5A708A] uppercase tracking-[0.06em] mt-0.5">Population (2011)</div>
                            </div>
                            <div className="p-3 bg-[#F5F7FA] border-l-4 border-[#D0DCF0] rounded-r-sm">
                                <div className="text-[1.1rem] font-extrabold text-[#1B3A6B] tracking-[-0.02em]">2,997 <span className="text-[0.8rem] font-normal">km²</span></div>
                                <div className="text-[0.6rem] font-bold text-[#5A708A] uppercase tracking-[0.06em] mt-0.5">Area</div>
                            </div>
                            <div className="p-3 bg-[#F5F7FA] border-l-4 border-[#D0DCF0] rounded-r-sm">
                                <div className="text-[1.1rem] font-extrabold text-[#1B3A6B] tracking-[-0.02em]">83.3%</div>
                                <div className="text-[0.6rem] font-bold text-[#5A708A] uppercase tracking-[0.06em] mt-0.5">Literacy Rate</div>
                            </div>
                            <div className="p-3 bg-[#F5F7FA] border-l-4 border-[#D0DCF0] rounded-r-sm">
                                <div className="text-[1.1rem] font-extrabold text-[#1B3A6B] tracking-[-0.02em]">8</div>
                                <div className="text-[0.6rem] font-bold text-[#5A708A] uppercase tracking-[0.06em] mt-0.5">Revenue Taluks</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
