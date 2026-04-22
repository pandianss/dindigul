import React from 'react';
import { Achievement } from '../../types';
import { AchievementCard } from './AchievementCard';

interface AchievementsTimelineProps {
    achievements: Achievement[];
}

export const AchievementsTimeline: React.FC<AchievementsTimelineProps> = ({ achievements }) => {
    if (!achievements?.length) return null;

    return (
        <section id="achievements" className="py-24 px-8 bg-[#1B3A6B] relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#F5F7FA] to-transparent opacity-10"></div>
            
            <div className="max-w-6xl mx-auto relative z-10">
                <div className="mb-20 text-center reveal">
                    <div className="inline-flex items-center gap-2 text-[0.62rem] font-black tracking-[0.25em] uppercase text-[#00AEEF] mb-4">
                        <span className="w-12 h-[1px] bg-[#00AEEF]/40"></span>
                        Regional Milestones
                        <span className="w-12 h-[1px] bg-[#00AEEF]/40"></span>
                    </div>
                    <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-black text-white tracking-tight leading-none mb-6">
                        Legacy of <span className="text-[#00AEEF]">Excellence</span>
                    </h2>
                    <p className="text-[1rem] text-white/40 max-w-[600px] mx-auto leading-relaxed">
                        Tracking our journey of growth, community impact, and operational milestones across Dindigul and Theni.
                    </p>
                </div>

                <div className="relative mt-20">
                    {/* Horizontal Timeline Bar (Desktop) */}
                    <div className="absolute left-[15px] sm:left-1/2 top-4 bottom-0 w-[2px] bg-gradient-to-b from-[#00AEEF]/40 via-[#00AEEF]/10 to-transparent -translate-x-1/2 z-0 hidden sm:block"></div>

                    <div className="space-y-12 sm:space-y-24">
                        {achievements.map((ach, i) => (
                            <AchievementCard key={i} ach={ach} index={i} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};
