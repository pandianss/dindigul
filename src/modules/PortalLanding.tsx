import React from 'react';
import { Shield, Users, Landmark, ChevronRight, Globe, Lock } from 'lucide-react';

interface PortalLandingProps {
    onSelectPortal: (portal: 'guest' | 'region') => void;
}

const PortalLanding: React.FC<PortalLandingProps> = ({ onSelectPortal }) => {

    return (
        <div className="min-h-screen bg-[#001529] relative overflow-hidden flex flex-col items-center justify-center p-6 font-sans">
            {/* Animated Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-bank-gold/5 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-bank-teal/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

            {/* Header / Logo Section */}
            <div className="relative z-10 mb-12 text-center">
                <div className="inline-flex items-center justify-center p-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl mb-6 shadow-2xl">
                    <Landmark className="w-10 h-10 text-bank-gold" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-3">
                    DINDIGUL <span className="text-bank-gold">OPERATIONS</span>
                </h1>
                <p className="text-white/40 font-medium tracking-[0.2em] uppercase text-xs">
                    Next-Gen Banking Command & Control
                </p>
            </div>

            {/* Selection Grid */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">

                {/* Guest Portal Card */}
                <button
                    onClick={() => onSelectPortal('guest')}
                    className="group relative flex flex-col items-start p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] text-left transition-all duration-500 hover:bg-white/10 hover:border-bank-teal/50 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,180,180,0.15)] overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Globe className="w-32 h-32 text-bank-teal" />
                    </div>

                    <div className="w-14 h-14 bg-bank-teal/20 rounded-2xl flex items-center justify-center mb-6 border border-bank-teal/30 group-hover:scale-110 transition-transform">
                        <Users className="w-7 h-7 text-bank-teal" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-bank-teal transition-colors">Guest Portal</h2>
                    <p className="text-white/50 text-sm leading-relaxed mb-8 max-w-[280px]">
                        Public access for viewing general operational branch data, performance metrics, and general notices.
                    </p>

                    <div className="mt-auto flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-bank-teal opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                        Launch Terminal <ChevronRight className="ml-1 w-4 h-4" />
                    </div>
                </button>

                {/* Region User Portal Card */}
                <button
                    onClick={() => onSelectPortal('region')}
                    className="group relative flex flex-col items-start p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] text-left transition-all duration-500 hover:bg-white/10 hover:border-bank-gold/50 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(212,175,55,0.15)] overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Lock className="w-32 h-32 text-bank-gold" />
                    </div>

                    <div className="w-14 h-14 bg-bank-gold/20 rounded-2xl flex items-center justify-center mb-6 border border-bank-gold/30 group-hover:scale-110 transition-transform">
                        <Shield className="w-7 h-7 text-bank-gold" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-bank-gold transition-colors">Region User Portal</h2>
                    <p className="text-white/50 text-sm leading-relaxed mb-8 max-w-[280px]">
                        Secure administrative console for regional management, MIS reporting, and executive decisioning.
                    </p>

                    <div className="mt-auto flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-bank-gold opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                        Authorized Entry <ChevronRight className="ml-1 w-4 h-4" />
                    </div>
                </button>

            </div>

            {/* Footer Status Bar */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center opacity-30 pointer-events-none">
                <div className="flex items-center space-x-6 text-[9px] font-black uppercase tracking-[0.3em] text-white">
                    <span className="flex items-center"><span className="w-1 h-1 bg-green-500 rounded-full mr-2 shadow-[0_0_8px_rgba(34,197,94,0.8)]" /> System Online</span>
                    <span className="flex items-center"><span className="w-1 h-1 bg-blue-500 rounded-full mr-2 shadow-[0_0_8px_rgba(59,130,246,0.8)]" /> Encrypted Session</span>
                    <span className="flex items-center"><span className="w-1 h-1 bg-bank-gold rounded-full mr-2 shadow-[0_0_8px_rgba(212,175,55,0.8)]" /> V2.0.26</span>
                </div>
            </div>
        </div>
    );
};

export default PortalLanding;
