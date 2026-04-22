import React from 'react';

export const Footer: React.FC = () => {
    return (
        <section id="contact" className="py-20 px-8 bg-[#1B3A6B] text-white border-t border-white/10">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                <div className="lg:col-span-2">
                    <img src="/assets/logo_full.svg" alt="IOB Logo" className="h-8 mb-6 opacity-80 brightness-0 invert" />
                    <h3 className="text-xl font-black mb-4 tracking-tight">Indian Overseas Bank</h3>
                    <p className="text-sm text-white/50 leading-relaxed max-w-sm mb-8">
                        Dindigul Regional Office — Committed to providing world-class banking services while preserving the rich cultural and economic heritage of the region.
                    </p>
                    <div className="flex gap-4">
                        <div className="w-10 h-10 border border-white/10 rounded flex items-center justify-center hover:bg-[#0090C8] transition-colors cursor-pointer">FB</div>
                        <div className="w-10 h-10 border border-white/10 rounded flex items-center justify-center hover:bg-[#0090C8] transition-colors cursor-pointer">TW</div>
                        <div className="w-10 h-10 border border-white/10 rounded flex items-center justify-center hover:bg-[#0090C8] transition-colors cursor-pointer">IN</div>
                    </div>
                </div>

                <div>
                    <h4 className="text-[0.65rem] font-black uppercase tracking-[0.25em] text-[#00AEEF] mb-6">Regional Office</h4>
                    <div className="space-y-4 text-[0.85rem] text-white/60">
                        <p>
                            10/1, S.M.B.M School Road,<br />
                            Near Collectorate,<br />
                            Dindigul — 624 004.
                        </p>
                        <p>Phone: 0451 - 2461413 / 2460655</p>
                        <p>Email: rodglro@iob.in</p>
                    </div>
                </div>

                <div>
                    <h4 className="text-[0.65rem] font-black uppercase tracking-[0.25em] text-[#00AEEF] mb-6">Quick Links</h4>
                    <div className="flex flex-col gap-3 text-[0.85rem] font-bold">
                        <a href="https://www.iob.in" target="_blank" rel="noreferrer" className="hover:text-[#00AEEF] transition-colors">Corporate Website</a>
                        <a href="https://www.iobnet.co.in" target="_blank" rel="noreferrer" className="hover:text-[#00AEEF] transition-colors">Internet Banking</a>
                        <a href="#overview" className="hover:text-[#00AEEF] transition-colors">Economic Highlights</a>
                        <a href="#tourism" className="hover:text-[#00AEEF] transition-colors">Regional Tourism</a>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-[0.65rem] font-medium text-white/30 uppercase tracking-[0.15em]">
                    © {new Date().getFullYear()} Indian Overseas Bank. All Rights Reserved.
                </div>
                <div className="flex gap-8 text-[0.65rem] font-bold text-white/30 uppercase tracking-[0.1em]">
                    <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                    <a href="#" className="hover:text-white transition-colors">Terms of Use</a>
                    <a href="#" className="hover:text-white transition-colors">Security</a>
                </div>
            </div>
        </section>
    );
};
