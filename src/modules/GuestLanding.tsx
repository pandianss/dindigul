import React, { useEffect, useState } from 'react';
import { Landmark, Award, Plus, MapPin, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { parseLocalISO, formatLocalISO } from '../utils/dateUtils';
import { cn } from '../utils/cn';
import api, { STATIC_URL, getStaticUrl } from '../services/api';

interface SetupData {
    branches: number;
    atms: number;
    regionalOffices: number;
    staff: number;
    totalDeposits: number;
    leadership?: { 
        name: string; 
        nameTa?: string; 
        nameHi?: string; 
        designation: string; 
        designationTa?: string; 
        designationHi?: string; 
        isHead: boolean; 
        isSecondLine?: boolean;
        role: string;
        photoUrl?: string;
    }[];
    events?: { date: string; name: string; type: string; venue?: string }[];
    achievements?: { title: string; description: string; date: string; category: string; photoUrl?: string }[];
    business?: { val: number, growth: number };
    deposits?: { val: number, growth: number };
    casa?: { val: number, growth: number };
    rtd?: { val: number, growth: number };
    advances?: { val: number, growth: number };
    sb?: { val: number, growth: number };
    cd?: { val: number, growth: number };
    td?: { val: number, growth: number };
    branchList?: Array<{
        code: string;
        nameEn: string;
        district: string;
        business: number;
        asOnDate?: string;
        headName?: string;
        headDesignation?: string;
        headPhotoUrl?: string | null;
        secondLineName?: string;
        secondLineDesignation?: string;
        secondLinePhotoUrl?: string | null;
    }>;
    asOnDate?: string;
}

interface GuestLandingProps {
    onExitPortal: () => void;
}

interface AchievementCardProps {
    ach: { title: string; description: string; date: string; category: string; photoUrl?: string };
    index: number;
}

const AchievementCard: React.FC<AchievementCardProps> = ({ ach, index }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isEven = index % 2 === 0;

    return (
        <div className={`flex flex-col sm:flex-row items-center sm:justify-center relative w-full reveal`} style={{ transitionDelay: `${index * 100}ms` }}>
            {/* Timeline Date Marker */}
            <div className="absolute left-[15px] sm:left-1/2 top-10 z-20 -translate-x-1/2 hidden sm:flex flex-col items-center">
                <div className="w-4 h-4 rounded-full border-2 border-[#00AEEF] bg-[#1B3A6B] shadow-[0_0_15px_rgba(0,174,239,0.5)] mb-2"></div>
                <div className="bg-[#1B3A6B] border border-[#00AEEF]/30 px-2 py-1 rounded text-[0.6rem] font-black text-[#00AEEF] uppercase tracking-tighter shadow-lg whitespace-nowrap">
                    {parseLocalISO(ach.date)?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
            </div>

            <div className={`w-full sm:w-[45%] ${isEven ? 'sm:mr-auto sm:pr-12' : 'sm:ml-auto sm:pl-12'} relative`}>
                <div className="group bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden hover:bg-white/[0.07] hover:border-white/20 transition-all duration-500 shadow-xl">
                    <div className="flex flex-col">
                        {ach.photoUrl && (
                            <div className="aspect-[21/9] overflow-hidden relative">
                                <img
                                    src={getStaticUrl(ach.photoUrl)}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    alt={ach.title}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1B3A6B]/80 to-transparent"></div>
                            </div>
                        )}

                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-[0.6rem] font-black text-[#00AEEF] uppercase tracking-widest bg-[#00AEEF]/10 px-2 py-0.5 rounded-sm">
                                    {ach.category}
                                </span>
                                <span className="text-[0.65rem] font-bold text-white/40">
                                    {parseLocalISO(ach.date)?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                </span>
                            </div>

                            <h3 className="text-lg font-black text-white mb-2 leading-tight">
                                "{ach.title}"
                            </h3>

                            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                                <p className="text-[0.85rem] text-white/60 leading-relaxed italic border-l-2 border-[#00AEEF]/30 pl-4 py-1">
                                    {ach.description.replace(/<[^>]*>?/gm, '')}
                                </p>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#00AEEF] hover:text-white transition-colors flex items-center gap-2"
                                >
                                    {isExpanded ? 'Hide Info' : 'Details'}
                                    <div className={`w-6 h-6 rounded-full border border-white/10 flex items-center justify-center transition-all duration-300 ${isExpanded ? 'bg-[#00AEEF] border-[#00AEEF] rotate-45' : ''}`}>
                                        <Plus size={10} className="text-white" />
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Indicator Dot */}
            <div className="absolute left-[15px] top-10 w-3 h-3 rounded-full bg-[#00AEEF] sm:hidden"></div>
        </div>
    );
};

const GuestLanding: React.FC<GuestLandingProps> = ({ onExitPortal }) => {
    const [setupData, setSetupData] = useState<SetupData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Add Inter font to document head if not present
        if (!document.getElementById('inter-font')) {
            const link = document.createElement('link');
            link.id = 'inter-font';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap';
            document.head.appendChild(link);
        }

        const fetchSetupData = async () => {
            try {
                const response = await fetch('/api/public/setup');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setSetupData(data.setup);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch setup data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSetupData();
    }, []);

    // Intersection Observer for scroll animations runs after loading changes
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target); // Optional: only animate once
                    }
                });
            },
            { threshold: 0.05, rootMargin: "50px" }
        );

        // Give React a tick to paint the dynamic data before finding elements
        const timer = setTimeout(() => {
            const revealElements = document.querySelectorAll('.reveal');
            revealElements.forEach(el => observer.observe(el));
        }, 100);

        return () => {
            clearTimeout(timer);
            observer.disconnect();
        };
    }, [loading, setupData]);

    return (
        <div className="guest-portal-wrapper antialiased text-[#1A2D4F] bg-[#F5F7FA] font-['Inter',sans-serif] text-[15px] leading-[1.6] pt-[72px]">

            {/* Fixed Navigation */}
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

            {/* Hero Section */}
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

                    <div className="hidden lg:block bg-white/5 border border-white/10 backdrop-blur-md p-7 rounded-sm">
                        <div className="text-[0.6rem] font-bold tracking-[0.15em] uppercase text-[#00AEEF] mb-5 pb-3 border-b border-white/10">
                            Regional Snapshot
                        </div>
                        {[
                            { k: 'Combined Area', v: '10,181 km²', hl: true },
                            { k: 'Combined Population', v: '~50.8 Lakh' },
                            { k: 'Dindigul Literacy Rate', v: '77.2%' },
                            { k: 'Theni Literacy Rate', v: '83.3%' },
                            { k: 'Locks Export Share', v: '~80% of India', hl: true },
                            { k: 'Cardamom Market (Bodi)', v: "Asia's 2nd Largest" },
                            { k: 'GI Tags Held', v: '3 Products', hl: true },
                            { k: 'Highest Peak (Vembadi)', v: '2,695 m' },
                        ].map((row, i) => (
                            <div key={i} className={`flex justify-between items-baseline py-2 text-[0.8rem] ${i !== 7 ? 'border-b border-white/5' : ''}`}>
                                <span className="text-white/50">{row.k}</span>
                                <span className={`font-bold text-[0.85rem] ${row.hl ? 'text-[#00AEEF]' : 'text-white'}`}>{row.v}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* METRICS BAND WITH DYNAMIC SETUP DATA */}
            <div className="bg-[#1B3A6B]">
                <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-white/10 border-x border-white/10">

                    {/* Dynamic Data from Settings */}

                    <div className="p-8 pb-6 text-center reveal border-b lg:border-b-0 border-white/10">
                        <div className="text-[1.75rem] font-extrabold text-[#00AEEF] tracking-tight leading-none mb-1">
                            {loading ? <span className="text-white/20 animate-pulse">...</span> : setupData?.branches || 0}
                        </div>
                        <div className="text-[0.62rem] font-bold text-white/40 uppercase tracking-[0.1em]">Bank Branches</div>
                        <div className="text-[0.65rem] text-white/25 mt-0.5">Active Setup</div>
                    </div>

                    <div className="p-8 pb-6 text-center reveal border-b lg:border-b-0 border-white/10">
                        <div className="text-[1.75rem] font-extrabold text-white tracking-tight leading-none mb-1">
                            {loading ? <span className="text-white/20 animate-pulse">...</span> : setupData?.atms || 0}
                        </div>
                        <div className="text-[0.62rem] font-bold text-white/40 uppercase tracking-[0.1em]">ATM Network</div>
                        <div className="text-[0.65rem] text-white/25 mt-0.5">Live Terminals</div>
                    </div>

                    <div className="p-8 pb-6 text-center reveal border-b lg:border-b-0 border-white/10">
                        <div className="text-[1.75rem] font-extrabold text-white tracking-tight leading-none mb-1">
                            {loading ? <span className="text-white/20 animate-pulse">...</span> : setupData?.staff || 0}
                        </div>
                        <div className="text-[0.62rem] font-bold text-white/40 uppercase tracking-[0.1em]">Total Staff</div>
                        <div className="text-[0.65rem] text-white/25 mt-0.5">Active Members</div>
                    </div>

                    {/* Static Data */}
                    <div className="p-8 pb-6 text-center reveal border-b lg:border-b-0 border-white/10">
                        <div className="text-[1.75rem] font-extrabold text-white tracking-tight leading-none mb-1">
                            50.8<em className="text-[#00AEEF] not-italic">L</em>
                        </div>
                        <div className="text-[0.62rem] font-bold text-white/40 uppercase tracking-[0.1em]">Population</div>
                        <div className="text-[0.65rem] text-white/25 mt-0.5">Census 2011</div>
                    </div>
                    <div className="p-8 pb-6 text-center reveal border-b lg:border-b-0 border-white/10">
                        <div className="text-[1.75rem] font-extrabold text-white tracking-tight leading-none mb-1">
                            10<em className="text-[#00AEEF] not-italic">K+</em>
                        </div>
                        <div className="text-[0.62rem] font-bold text-white/40 uppercase tracking-[0.1em]">Area (km²)</div>
                        <div className="text-[0.65rem] text-white/25 mt-0.5">Combined</div>
                    </div>
                </div>

                {/* BUSINESS METRICS BAND */}
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center px-8 py-3 bg-[#122850]/60 border-x border-white/10">
                        <div className="text-[0.65rem] font-bold text-[#00AEEF] uppercase tracking-[0.2em]">
                            Regional Performance Metrics <span className="text-white/40 ml-2 tracking-normal font-medium">(₹ in Crores)</span>
                        </div>
                        {setupData && setupData.asOnDate && (
                            <div className="text-[0.65rem] font-bold text-white/40 uppercase tracking-[0.1em]">
                                As on {format(parseLocalISO(setupData.asOnDate) || new Date(), 'dd.MM.yyyy')}
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-white/10 border-x border-t border-white/10 bg-[#122850]/40">
                        {[
                            { label: 'SB', data: setupData?.sb },
                            { label: 'CD', data: setupData?.cd },
                            { label: 'TD', data: setupData?.td },
                            { label: 'Advances', data: setupData?.advances },
                            { label: 'Total Business', data: setupData?.business },
                        ].map((metric, i) => (
                            <div key={i} className="p-8 pb-6 text-center reveal border-b md:border-b-0 border-white/10 flex flex-col items-center justify-center">
                                <div className="text-[1.6rem] font-extrabold text-white tracking-tight leading-none mb-1">
                                    {loading || !metric.data ? (
                                        <span className="text-white/20 animate-pulse">...</span>
                                    ) : (
                                        <>
                                            ₹{metric.data.val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            <span className="text-[0.9rem] opacity-60 font-bold ml-1">Cr</span>
                                        </>
                                    )}
                                </div>
                                <div className="text-[0.62rem] font-bold text-[#00AEEF] uppercase tracking-[0.1em]">{metric.label}</div>
                                {metric.data && (
                                    <div className={`text-[0.65rem] font-bold mt-2 inline-flex items-center gap-1 border px-2 py-0.5 rounded-sm ${metric.data.growth >= 0 ? 'text-[#00AEEF] border-[#00AEEF]/30 bg-[#00AEEF]/5' : 'text-red-400 border-red-400/30 bg-red-400/5'}`}>
                                        {metric.data.growth >= 0 ? '↗' : '↘'} {Math.abs(metric.data.growth).toLocaleString('en-IN', { maximumFractionDigits: 0 })} FY
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* OVERVIEW */}
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

            {/* ECONOMY SECTION */}
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
                        {[
                            { i: '🔒', t: 'Locks Industry', tag: 'Dindigul · GI Tagged', desc: "India's premier lock-manufacturing hub, supplying ~80% of the country's brass locks. The cluster exports to over 40 countries.", c: '#1B3A6B' },
                            { i: '🧥', t: 'Leather & Tanneries', tag: 'Dindigul · Export', desc: "Among Tamil Nadu's top leather processing centres. Finished goods, shoe uppers, and industrial leather exported globally.", c: '#0090C8' },
                            { i: '🍌', t: 'Banana Cultivation', tag: 'Theni · Commercial', desc: "One of India's foremost banana districts. Cavendish, Nendran, and Poovan varieties supply markets widely.", c: '#1B3A6B' },
                            { i: '🌿', t: 'Cardamom & Spices', tag: 'Theni · GI Tagged', desc: "Cumbum Valley and High Ranges produce premium small cardamom. Bodinayakanur is Asia's 2nd largest cardamom auction platform.", c: '#C8970A', gt: true },
                            { i: '🍇', t: 'Grapes & Horticulture', tag: 'Theni · Cumbum Valley', desc: 'Cumbum Valley — the "Grape City of South India." Muscat and Thompson varieties supply domestic wineries and export chains.', c: '#0090C8' },
                            { i: '🧵', t: 'Textiles & Handloom', tag: 'Both Districts', desc: 'Spinning mills in Palani, Oddanchatram, and Uthamapalayam supply yarn to the Tirupur knitwear cluster and domestic retailers.', c: '#1B3A6B' },
                        ].map((p, i) => (
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

            {/* TOURISM SECTION */}
            <section id="tourism" className="py-20 px-8 bg-[#F5F7FA] overflow-hidden">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-12 reveal text-center">
                        <div className="inline-flex items-center gap-2 text-[0.62rem] font-bold tracking-[0.18em] uppercase text-[#0090C8] mb-3 before:content-[''] before:block before:w-5 before:h-[2px] before:bg-[#0090C8] after:content-[''] after:block after:w-5 after:h-[2px] after:bg-[#0090C8]">
                            Explore the Region
                        </div>
                        <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold text-[#1B3A6B] tracking-[-0.02em] leading-[1.2] mb-4">
                            Places of Interest
                        </h2>
                        <p className="text-[0.95rem] text-[#5A708A] max-w-[700px] mx-auto leading-[1.8]">
                            Beyond its economic prowess, the region is a tapestry of breathtaking natural wonders, sacred spiritual sites, and layers of living history.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Dindigul Highlights */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-[#1B3A6B] text-white rounded-sm shadow-md">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <h3 className="text-xl font-bold text-[#1B3A6B]">Dindigul District</h3>
                            </div>
                            
                            {[
                                { 
                                    t: 'Kodaikanal', 
                                    tag: 'Princess of Hill Stations', 
                                    desc: 'Nestled in the Palani Hills at 2,133m, offering the iconic Kodaikanal Lake, Bryant Park, and dramatic views from Pillar Rocks.', 
                                    icon: '🏔️' 
                                },
                                { 
                                    t: 'Palani Murugan Temple', 
                                    tag: 'Spiritual Heritage', 
                                    desc: 'One of the Arupadaiveedu (Six Abodes) of Lord Murugan. A majestic hilltop shrine that draws millions of devotees globally.', 
                                    icon: '🛕' 
                                },
                                { 
                                    t: 'Dindigul Rock Fort', 
                                    tag: 'Historical Landmark', 
                                    desc: 'A 17th-century strategic fortress built by the Nayaks and later used by Tipu Sultan, offering panoramic regional views.', 
                                    icon: '🏰' 
                                }
                            ].map((spot, i) => (
                                <div key={i} className="group bg-white border border-[#D0DCF0] p-6 rounded-lg hover:border-[#0090C8] hover:shadow-xl transition-all duration-300 reveal">
                                    <div className="flex gap-5">
                                        <div className="w-12 h-12 bg-[#F5F7FA] rounded-full flex items-center justify-center text-2xl group-hover:bg-[#E0F4FB] transition-colors flex-shrink-0">
                                            {spot.icon}
                                        </div>
                                        <div>
                                            <div className="text-[1.1rem] font-bold text-[#1B3A6B] mb-1 group-hover:text-[#0090C8] transition-colors">{spot.t}</div>
                                            <div className="text-[0.6rem] font-black text-[#0090C8] uppercase tracking-[0.1em] mb-2">{spot.tag}</div>
                                            <p className="text-[0.82rem] text-[#5A708A] leading-[1.6]">{spot.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Theni Highlights */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-[#0090C8] text-white rounded-sm shadow-md">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <h3 className="text-xl font-bold text-[#1B3A6B]">Theni District</h3>
                            </div>

                            {[
                                { 
                                    t: 'Meghamalai', 
                                    tag: 'High Wavy Mountains', 
                                    desc: 'A hidden paradise of tea and cardamom plantations, misty peaks, and the serene Highwavys Dam and Lake.', 
                                    icon: '🍃' 
                                },
                                { 
                                    t: 'Suruli Falls', 
                                    tag: 'Cascading Wonder', 
                                    desc: "A two-stage waterfall immortalized in Tamil literature, nestled in a lush forest that filters sunlight through the canopy.", 
                                    icon: '🌊' 
                                },
                                { 
                                    t: 'Vaigai Dam', 
                                    tag: 'The Lifeline', 
                                    desc: 'A colossal engineering feat providing irrigation to five districts, featuring a beautifully landscaped garden and picnic park.', 
                                    icon: '🏗️' 
                                }
                            ].map((spot, i) => (
                                <div key={i} className="group bg-white border border-[#D0DCF0] p-6 rounded-lg hover:border-[#0090C8] hover:shadow-xl transition-all duration-300 reveal">
                                    <div className="flex gap-5">
                                        <div className="w-12 h-12 bg-[#F5F7FA] rounded-full flex items-center justify-center text-2xl group-hover:bg-[#E0F4FB] transition-colors flex-shrink-0">
                                            {spot.icon}
                                        </div>
                                        <div>
                                            <div className="text-[1.1rem] font-bold text-[#1B3A6B] mb-1 group-hover:text-[#0090C8] transition-colors">{spot.t}</div>
                                            <div className="text-[0.6rem] font-black text-[#0090C8] uppercase tracking-[0.1em] mb-2">{spot.tag}</div>
                                            <p className="text-[0.82rem] text-[#5A708A] leading-[1.6]">{spot.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ORGANIZATION STRUCTURE SECTION */}
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
                        {/* ORGANIZATIONAL TREE */}
                        <div className="flex flex-col items-center gap-16 relative">
                            {/* VERTICAL CONNECTING LINE - MAIN TRUNK */}
                            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-[#00AEEF] via-[#D0DCF0] to-transparent z-0 opacity-40"></div>

                            {/* LEVEL 0: REGION HEAD */}
                            {setupData?.leadership?.filter(l => l.isHead).map((head, i) => (
                                <div key={i} className="relative z-10 reveal">
                                    <div className="bg-white border-2 border-[#00AEEF] p-6 w-72 flex flex-col items-center text-center shadow-xl rounded-lg transform transition-transform hover:scale-105">
                                        <div className="w-20 h-20 bg-[#E0F4FB] text-[#0090C8] rounded-full flex justify-center items-center text-3xl font-black mb-4 border-4 border-white shadow-md overflow-hidden relative group">
                                            {head.photoUrl ? (
                                                <img 
                                                    src={getStaticUrl(head.photoUrl)} 
                                                    alt={head.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                head.name.charAt(0)
                                            )}
                                        </div>
                                        <h3 className="text-lg font-black text-[#1B3A6B] leading-tight">{head.name}</h3>
                                        <p className="text-[0.65rem] text-[#0090C8] font-bold mt-1 uppercase tracking-[0.15em]">{head.designation}</p>
                                        <div className="mt-4 flex items-center gap-2">
                                            <div className="bg-[#00AEEF] text-white text-[0.6rem] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-sm">
                                                Regional Head
                                            </div>
                                            <span className="text-[0.6rem] font-black bg-[#1B3A6B] text-white px-1.5 py-0.5 rounded">I</span>
                                        </div>
                                        {/* 2nd Line for Region Head if any */}
                                        {setupData?.leadership?.filter(l => l.isSecondLine && l.role === 'RO_MANAGER').map((sec, j) => (
                                            <div key={j} className="mt-4 pt-4 border-t border-gray-100 w-full flex flex-col items-center">
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

                                    {/* LEVEL 1: SECOND LINE (CMs) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-5xl relative">
                                {/* HORIZONTAL CROSSBAR FOR CMs */}
                                <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-[#D0DCF0] -translate-y-8 hidden md:block opacity-40"></div>

                                {(() => {
                                    const cms = (setupData?.leadership?.filter(l => !l.isHead) || [])
                                        .sort((a, b) => a.isSecondLine === b.isSecondLine ? 0 : a.isSecondLine ? -1 : 1);
                                    const districts = Array.from(new Set(setupData?.branchList?.map(b => b.district) || []))
                                        .map(d => ({
                                            name: d,
                                            total: setupData?.branchList?.filter(b => b.district === d).reduce((acc, b) => acc + b.business, 0) || 0,
                                            branches: setupData?.branchList?.filter(b => b.district === d) || []
                                        }))
                                        .sort((a, b) => b.total - a.total);
                                    
                                    return cms.map((cm, i) => {
                                        const dGroup = districts[i];

                                        return (
                                            <div key={i} className="flex flex-col items-center relative reveal">
                                                {/* VERTICAL LINE FROM CROSSBAR */}
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-[#D0DCF0] -translate-y-8 hidden md:block opacity-40"></div>
                                                
                                                <div className="bg-white border border-[#D0DCF0] p-6 w-64 flex flex-col items-center text-center shadow-lg rounded-lg z-10 hover:border-[#0090C8] transition-colors">
                                                    <div className="w-16 h-16 bg-[#F5F7FA] text-[#1B3A6B] rounded-full flex justify-center items-center text-2xl font-black mb-4 border-2 border-white shadow-sm overflow-hidden">
                                                        {cm.photoUrl ? (
                                                            <img 
                                                                src={getStaticUrl(cm.photoUrl)} 
                                                                alt={cm.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            cm.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <h3 className="text-base font-bold text-[#1B3A6B] leading-tight">{cm.name}</h3>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <p className="text-[0.6rem] text-[#5A708A] font-bold uppercase tracking-[0.1em]">
                                                            {cm.designation.replace(/\s*-\s*I{1,2}\s*line$/i, '').trim()}
                                                        </p>
                                                        {cm.isSecondLine && (
                                                            <span className="text-[0.45rem] font-black bg-[#5A708A] text-white px-1 rounded-sm shadow-sm">II</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* DISTRICT NODE UNDER EACH CM */}
                                                {dGroup && (
                                                    <div className="mt-12 w-full">
                                                        <div className="flex flex-col items-center">
                                                            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-[#D0DCF0] translate-y-24 opacity-20"></div>
                                                            
                                                            <div className="px-5 py-2 bg-[#E0F4FB] border border-[#0090C8]/20 rounded-md mb-6 z-10">
                                                                <div className="text-[0.65rem] font-black text-[#0090C8] uppercase tracking-[0.15em]">{dGroup.name} District</div>
                                                                <div className="text-[0.55rem] font-bold text-[#5A708A] text-center">{dGroup.branches.length} Branches · ₹{Math.round(dGroup.total).toLocaleString()} Cr</div>
                                                            </div>

                                                            {/* BRANCHES SUBTREE (Scrollable Grid) */}
                                                            <div className="w-full bg-[#EAEEF4]/40 border border-[#D0DCF0] rounded-lg p-5 max-h-[400px] overflow-y-auto custom-scrollbar z-10 shadow-inner">
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    {dGroup.branches.map((br, idx) => (
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
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* EVENTS SECTION */}
            <section id="events" className="py-16 px-8 bg-[#F5F7FA] border-t border-[#D0DCF0]">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-10 reveal text-center">
                        <h2 className="text-[clamp(1.4rem,2.5vw,2rem)] font-extrabold text-[#1B3A6B] tracking-[-0.02em] leading-[1.2] mb-2.5">
                            Upcoming Calendar Events
                        </h2>
                    </div>
                    <div className="space-y-6">
                        {setupData?.events?.length ? (
                            Object.entries(setupData.events.reduce((acc: any, event) => {
                                const dateKey = formatLocalISO(parseLocalISO(event.date));
                                if (!acc[dateKey]) acc[dateKey] = [];
                                acc[dateKey].push(event);
                                return acc;
                            }, {} as any))
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([dateKey, dayEvents]: [string, any]) => {
                                    const dateObj = parseLocalISO(dateKey) || new Date();
                                    return (
                                        <div key={dateKey} className="flex flex-col sm:flex-row items-stretch bg-white border border-[#D0DCF0] rounded-sm reveal hover:border-[#0090C8] transition-colors shadow-sm overflow-hidden min-h-[100px]">
                                            <div className="flex-shrink-0 bg-[#F5F7FA] text-center w-full sm:w-28 py-4 px-2 border-b sm:border-b-0 sm:border-r border-[#D0DCF0] flex flex-col justify-center">
                                                <span className="text-[#00AEEF] text-[0.6rem] font-black uppercase tracking-widest">{dateObj.toLocaleString('en-US', { month: 'short' })}</span>
                                                <span className="text-[#1B3A6B] text-2xl font-black leading-none my-0.5">{dateObj.getDate()}</span>
                                                <span className="text-[#5A708A] text-[0.6rem] font-bold">{dateObj.getFullYear()}</span>
                                            </div>
                                            <div className="p-4 flex-1 space-y-3">
                                                {dayEvents.map((evt: any) => (
                                                    <div key={evt.id} className="group border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <h3 className="text-[0.95rem] font-bold text-[#1B3A6B] leading-tight">{evt.name}</h3>
                                                            <span className={cn(
                                                                "text-[0.55rem] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-current/20",
                                                                evt.type === 'MEETING' ? 'bg-indigo-50 text-indigo-600' :
                                                                    evt.type === 'SEMINAR' ? 'bg-pink-50 text-pink-600' :
                                                                        evt.type === 'CONFERENCE' ? 'bg-cyan-50 text-cyan-600' :
                                                                            evt.type === 'PUBLIC_HOLIDAY' ? 'bg-red-50 text-red-600' :
                                                                                evt.type === 'STATE_HOLIDAY' ? 'bg-blue-50 text-blue-600' :
                                                                                    'bg-gray-50 text-gray-500'
                                                            )}>
                                                                {evt.type.replace(/_/g, ' ')}
                                                            </span>
                                                        </div>
                                                        {evt.venue && (
                                                            <div className="flex items-center gap-1.5 text-[0.68rem] text-[#5A708A] font-bold uppercase tracking-tight opacity-70">
                                                                <div className="w-1 h-1 bg-[#0090C8] rounded-full" />
                                                                {evt.venue}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                        ) : (
                            <div className="text-center text-[#5A708A] text-sm py-8 bg-[#F5F7FA] rounded border border-dashed border-[#D0DCF0]">No upcoming events scheduled.</div>
                        )}
                    </div>
                </div>
            </section>

            {/* ACHIEVEMENTS SECTION (VERTICAL TIMELINE) */}
            <section id="achievements" className="py-24 px-8 bg-[#1B3A6B] relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00AEEF]/10 blur-[120px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[#0090C8]/5 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="max-w-4xl mx-auto relative z-10">
                    <div className="mb-14 reveal text-center">
                        <div className="inline-flex items-center gap-3 text-[0.65rem] font-black tracking-[0.25em] uppercase text-[#00AEEF] mb-3 before:content-[''] before:block before:w-8 before:h-[2px] before:bg-[#00AEEF] after:content-[''] after:block after:w-8 after:h-[2px] after:bg-[#00AEEF]">
                            Regional Triumphs
                        </div>
                        <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-black text-white tracking-[-0.03em] leading-[1.1] mb-4">
                            Timeline of <span className="text-[#00AEEF]">Achievements</span>
                        </h2>
                    </div>

                    <div className="relative">
                        {/* Vertical Line */}
                        <div className="absolute left-[15px] sm:left-1/2 top-4 bottom-4 w-px bg-white/10 -translate-x-1/2 hidden sm:block"></div>

                        <div className="max-h-[800px] overflow-y-auto custom-scrollbar px-2 sm:px-4 py-8">
                            <div className="space-y-16 relative">
                                {setupData?.achievements?.length ? setupData.achievements.map((ach, i) => (
                                    <AchievementCard key={i} ach={ach} index={i} />
                                )) : (
                                    <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-2xl">
                                        <Award size={40} className="mx-auto text-white/10 mb-4" />
                                        <p className="text-white/40 font-bold uppercase tracking-widest text-xs">No achievements found in timeline.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CONTACT DETAILS FOOTER */}
            <section id="contact" className="py-16 px-8 bg-white border-t border-[#D0DCF0]">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
                    <div className="reveal">
                        <img src="/assets/logo_full.svg" alt="IOB Logo" className="h-10 mb-6" />
                        <p className="text-[0.8rem] text-[#5A708A] leading-[1.7] mb-6">
                            Good People to Grow With. Serving Dindigul and Theni districts with a robust network of branches and digital banking solutions.
                        </p>
                    </div>

                    <div className="reveal">
                        <h3 className="text-[1rem] font-bold text-[#1B3A6B] mb-5 tracking-tight border-b border-[#D0DCF0] pb-2 inline-block">Regional Office</h3>
                        <p className="text-[0.85rem] text-[#5A708A] leading-[1.7] flex flex-col">
                            <strong>Indian Overseas Bank</strong>
                            <span>Dindigul Regional Office</span>
                            <span>MVM Nagar, Dindigul - 624001</span>
                            <span>Tamil Nadu, India</span>
                        </p>
                    </div>

                    <div className="reveal">
                        <h3 className="text-[1rem] font-bold text-[#1B3A6B] mb-5 tracking-tight border-b border-[#D0DCF0] pb-2 inline-block">Contact</h3>
                        <div className="text-[0.85rem] text-[#5A708A] leading-[1.7] flex flex-col gap-2">
                            <a href="tel:0451-2401666" className="font-semibold hover:text-[#00AEEF]">📞 0451-2401666</a>
                            <a href="mailto:rodindigul@iob.in" className="font-semibold hover:text-[#00AEEF]">✉️ rodindigul@iob.in</a>
                        </div>
                    </div>

                    <div className="reveal">
                        <h3 className="text-[1rem] font-bold text-[#1B3A6B] mb-5 tracking-tight border-b border-[#D0DCF0] pb-2 inline-block">Quick Links</h3>
                        <div className="text-[0.85rem] flex flex-col gap-2">
                            <a href="https://www.iob.in" target="_blank" rel="noopener noreferrer" className="text-[#5A708A] hover:text-[#00AEEF] transition-colors">↗ IOB Corporate Direct</a>
                            <a href="#" className="text-[#5A708A] hover:text-[#00AEEF] transition-colors" onClick={(e) => { e.preventDefault(); onExitPortal(); }}>🔒 Login to Staff Portal</a>
                        </div>
                    </div>
                </div>
            </section>

            {/* GLOBAL STYLES FOR ANIMATIONS AND UTILITIES */}
            <style>{`
        html { scroll-padding-top: 80px; }
        .reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .guest-portal-wrapper { scroll-behavior: smooth; }
      `}</style>
        </div>
    );
};

export default GuestLanding;
