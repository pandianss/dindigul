import React from 'react';

interface NavbarProps {
    onExitPortal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onExitPortal }) => {
    return (
        <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-[#D0DCF0] z-50 shadow-sm transition-all duration-300">
            <div className="max-w-6xl mx-auto px-8 py-4 flex flex-wrap gap-4 md:gap-8 items-center text-[0.85rem] font-bold tracking-tight text-[#1B3A6B] justify-between md:justify-start">
                <div className="flex items-center gap-3">
                    <img src="/assets/logo_full.svg" alt="IOB Logo" className="h-6" />
                    <span className="text-[#0090C8] font-bold tracking-widest uppercase text-[0.6rem] border-l border-[#D0DCF0] pl-3 ml-1 hidden lg:inline-block">Public Portal</span>
                </div>
                <div className="hidden md:flex flex-wrap gap-6 lg:gap-8 items-center mx-auto">
                    <a href="#overview" className="hover:text-[#0090C8] transition-colors">Overview</a>
                    <a href="#economy" className="hover:text-[#0090C8] transition-colors">Economy</a>
                    <a href="#tourism" className="hover:text-[#0090C8] transition-colors">Tourism</a>
                    <a href="#organization" className="hover:text-[#0090C8] transition-colors">Leadership</a>
                    <a href="#events" className="hover:text-[#0090C8] transition-colors">Events</a>
                    <a href="#achievements" className="hover:text-[#0090C8] transition-colors">Achievements</a>
                </div>
                <div className="flex gap-4 items-center">
                    <a href="#contact" className="hover:text-[#0090C8] transition-colors hidden sm:block">Contact Us</a>
                    <button onClick={onExitPortal} className="text-[#0090C8] hover:text-white font-bold transition-colors border border-[#0090C8] hover:bg-[#0090C8] px-4 py-1.5 rounded-sm text-[0.7rem] uppercase tracking-wider">Exit</button>
                </div>
            </div>
        </nav>
    );
};
