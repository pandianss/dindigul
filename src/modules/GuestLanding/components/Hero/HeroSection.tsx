import React from 'react';
import { RegionalSnapshot } from './RegionalSnapshot';

export const HeroSection: React.FC = () => {
    return (
        <div className="relative overflow-hidden pt-20 px-8 pb-16 min-h-[520px] flex items-center bg-gradient-to-br from-[#122850] via-[#1B3A6B] to-[#1d4580]">
            {/* Background Patterns */}
            <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(-55deg, transparent, transparent 40px, rgba(255,255,255,0.05) 40px, rgba(255,255,255,0.05) 41px)' }}></div>
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#00AEEF] via-[#0090C8] to-transparent z-0"></div>

            <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-16 items-center relative z-10">
                <div>
                    <div className="inline-flex items-center gap-2 bg-[#00AEEF]/10 border border-[#00AEEF]/30 text-[#00AEEF] text-[0.65rem] font-bold tracking-[0.12em] uppercase px-3 py-1.5 mb-5 rounded-sm">
                        <div className="w-1.5 h-1.5 bg-[#00AEEF] rounded-full"></div>
                        IOB Dindigul Region — District Intelligence Brief
                    </div>
                    <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold text-white leading-[1.15] mb-4 tracking-[-0.02em]">
                        Dindigul &amp; <span className="text-[#00AEEF]">Theni</span><br />Districts, Tamil Nadu
                    </h1>
                    <p className="text-[0.95rem] text-white/60 leading-[1.75] max-w-[540px] mb-8">
                        A comprehensive economic, cultural, and geographic profile of two of Tamil Nadu's most strategically significant districts — prepared for the Indian Overseas Bank, Dindigul Regional Office.
                    </p>
                    <div className="flex gap-3 flex-wrap">
                        <a href="#economy" className="inline-flex items-center gap-1.5 px-6 py-2.5 text-[0.78rem] font-semibold tracking-[0.04em] rounded bg-[#0090C8] text-white border-2 border-[#0090C8] hover:bg-[#00AEEF] transition-all">
                            Explore Economy &darr;
                        </a>
                        <a href="#tourism" className="inline-flex items-center gap-1.5 px-6 py-2.5 text-[0.78rem] font-semibold tracking-[0.04em] rounded bg-transparent text-white/80 border-2 border-white/30 hover:bg-white/10 transition-all">
                            Places of Interest
                        </a>
                    </div>
                </div>

                <RegionalSnapshot />
            </div>
        </div>
    );
};
