import React from 'react';
import { Quote, ChevronDown, ChevronUp, Bell } from 'lucide-react';
import { SRMMessage } from '../types';
import { cn } from '../../../utils/cn';

interface GreetingPanelProps {
    srmMessage: SRMMessage;
    msgExpanded: boolean;
    setMsgExpanded: (val: boolean) => void;
}

export const GreetingPanel: React.FC<GreetingPanelProps> = ({ srmMessage, msgExpanded, setMsgExpanded }) => {
    return (
        <div className="bg-bank-navy rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(27,58,92,0.3)] border border-white/5">
            {/* Header bar */}
            <div className="bg-gradient-to-r from-bank-navy via-[#1c2e6b] to-[#2a5298] px-6 py-5 flex items-center gap-5 border-b border-bank-gold/20">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-bank-gold to-[#e8c96a] flex items-center justify-center text-2xl font-black text-bank-navy shadow-lg shadow-bank-gold/20 shrink-0 ring-4 ring-bank-gold/10">
                    {srmMessage.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "RM"}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-lg font-black text-white uppercase tracking-tight truncate">
                            {srmMessage.name}
                        </h2>
                        <div className="flex gap-2 opacity-50">
                            {srmMessage.nameTa && <span className="font-tamil text-sm text-white/80">{srmMessage.nameTa}</span>}
                            {srmMessage.nameHi && <span className="font-hindi text-sm text-white/80">{srmMessage.nameHi}</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-black text-bank-gold uppercase tracking-[0.15em]">
                            {srmMessage.title}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[12px] font-bold text-white/50 uppercase tracking-wider">
                            {srmMessage.region}
                        </span>
                    </div>
                </div>
                <div className="hidden sm:block text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">
                    {new Date(srmMessage.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}
                </div>
            </div>

            {/* Highlight strip */}
            <div className="bg-bank-gold/[0.12] border-b border-bank-gold/10 px-6 py-3.5 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-bank-gold/20 flex items-center justify-center text-bank-gold shadow-sm">
                    <Bell size={16} strokeWidth={3} />
                </div>
                <div className="text-[13px] font-black text-bank-gold uppercase tracking-widest leading-none">
                    {srmMessage.highlight}
                </div>
            </div>

            {/* Message body */}
            <div className="px-7 py-6 group relative">
                <div className="absolute top-4 right-6 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform duration-700">
                    <Quote size={80} strokeWidth={1} />
                </div>
                <p className={cn(
                    "text-base text-white/70 leading-[1.8] font-medium tracking-tight relative z-10 transition-all duration-500",
                    !msgExpanded && "line-clamp-3"
                )}>
                    {srmMessage.message}
                </p>
                <button 
                    onClick={() => setMsgExpanded(!msgExpanded)} 
                    className="mt-6 flex items-center gap-2 text-[11px] font-black text-bank-gold uppercase tracking-[0.2em] hover:text-white transition-colors group/btn relative z-10"
                >
                    {msgExpanded ? (
                        <>Collapse Brief <ChevronUp size={14} strokeWidth={3} /></>
                    ) : (
                        <>Read Leadership Memo <ChevronDown size={14} strokeWidth={3} /></>
                    )}
                </button>
            </div>
        </div>
    );
};
