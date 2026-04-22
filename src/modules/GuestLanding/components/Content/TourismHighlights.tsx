import React from 'react';
import { MapPin } from 'lucide-react';
import { TOURISM_SPOTS } from '../../constants';

export const TourismHighlights: React.FC = () => {
    return (
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
                        
                        {TOURISM_SPOTS.DINDIGUL.map((spot, i) => (
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

                        {TOURISM_SPOTS.THENI.map((spot, i) => (
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
    );
};
