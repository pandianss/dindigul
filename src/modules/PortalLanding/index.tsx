import React from 'react';
import { Shield, Users, Landmark, Globe, Lock } from 'lucide-react';

// Components
import { PortalCard } from './components/PortalCard';

interface PortalLandingProps {
    onSelectPortal: (portal: 'guest' | 'region') => void;
}

const PortalLanding: React.FC<PortalLandingProps> = ({ onSelectPortal }) => {
    return (
        <div className="min-h-screen bg-[#000d1a] relative overflow-hidden flex flex-col items-center justify-center p-8 font-sans">
            {/* Animated Background Elements */}
            <div className="absolute top-[-15%] left-[-15%] w-[50%] h-[50%] bg-bank-gold/5 rounded-full blur-[150px] animate-pulse pointer-events-none" />
            <div className="absolute bottom-[-15%] right-[-15%] w-[50%] h-[50%] bg-bank-teal/5 rounded-full blur-[150px] animate-pulse pointer-events-none" style={{ animationDelay: '3s' }} />

            {/* Header / Logo Section */}
            <div className="relative z-10 mb-20 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
                <div className="inline-flex items-center justify-center p-5 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] mb-8 shadow-2xl group hover:scale-110 transition-transform duration-500">
                    <Landmark className="w-12 h-12 text-bank-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]" />
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4">
                    DINDIGUL <span className="text-bank-gold">OPERATIONS</span>
                </h1>
                <p className="text-white/30 font-black tracking-[0.5em] uppercase text-[10px] ml-1">
                    Next-Gen Banking Command & Control Center
                </p>
            </div>

            {/* Selection Grid */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-6xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                <PortalCard 
                    title="Public Interface"
                    description="Open terminal for branch performance metrics, regional operational status, and general banking bulletins. Optimized for real-time monitoring."
                    icon={Users}
                    bgIcon={Globe}
                    colorClass="text-bank-teal"
                    accentColor="bank-teal"
                    actionText="Inaugurate Session"
                    onClick={() => onSelectPortal('guest')}
                />

                <PortalCard 
                    title="Executive Console"
                    description="Secure administrative environment for authorized regional management. Access deep-dive reporting, financial decisioning, and personnel control."
                    icon={Shield}
                    bgIcon={Lock}
                    colorClass="text-bank-gold"
                    accentColor="bank-gold"
                    actionText="Authorize Entry"
                    onClick={() => onSelectPortal('region')}
                />
            </div>

            {/* Footer Status Bar */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center opacity-40 pointer-events-none animate-in fade-in duration-1000 delay-500 px-6">
                <div className="flex items-center bg-white/5 backdrop-blur-md px-10 py-3 rounded-full border border-white/5 space-x-10 text-[9px] font-black uppercase tracking-[0.4em] text-white/60">
                    <span className="flex items-center"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-3 shadow-[0_0_12px_rgba(16,185,129,0.8)]" /> Core Engine Online</span>
                    <span className="flex items-center"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3 shadow-[0_0_12px_rgba(59,130,246,0.8)]" /> Quantum Encrypted</span>
                    <span className="flex items-center"><span className="w-1.5 h-1.5 bg-bank-gold rounded-full mr-3 shadow-[0_0_12px_rgba(212,175,55,0.8)]" /> Build v4.19.26</span>
                </div>
            </div>
        </div>
    );
};

export default PortalLanding;
