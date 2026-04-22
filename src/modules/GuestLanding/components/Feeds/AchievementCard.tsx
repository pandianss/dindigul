import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { parseLocalISO } from '../../../../utils/dateUtils';
import { getStaticUrl } from '../../../../services/api';
import { Achievement } from '../../types';

interface AchievementCardProps {
    ach: Achievement;
    index: number;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({ ach, index }) => {
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
