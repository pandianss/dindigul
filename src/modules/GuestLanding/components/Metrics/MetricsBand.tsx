import React from 'react';
import { format } from 'date-fns';
import { SetupData } from '../../types';
import { parseLocalISO } from '../../../../utils/dateUtils';

interface MetricsBandProps {
    setupData: SetupData | null;
    loading: boolean;
}

export const MetricsBand: React.FC<MetricsBandProps> = ({ setupData, loading }) => {
    return (
        <div className="bg-[#1B3A6B]">
            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-white/10 border-x border-white/10">
                {/* Physical Network Stats */}
                {[
                    { label: 'Bank Branches', val: setupData?.branches || 0, meta: 'Active Setup', color: '#00AEEF' },
                    { label: 'ATM Network', val: setupData?.atms || 0, meta: 'Live Terminals', color: 'white' },
                    { label: 'Total Staff', val: setupData?.staff || 0, meta: 'Active Members', color: 'white' },
                    { label: 'Population', val: '50.8', em: 'L', meta: 'Census 2011', color: 'white' },
                    { label: 'Area (km²)', val: '10', em: 'K+', meta: 'Combined', color: 'white' },
                ].map((item, i) => (
                    <div key={i} className="p-8 pb-6 text-center reveal border-b lg:border-b-0 border-white/10">
                        <div className={`text-[1.75rem] font-extrabold tracking-tight leading-none mb-1`} style={{ color: item.color }}>
                            {loading && typeof item.val === 'number' ? (
                                <span className="text-white/20 animate-pulse">...</span>
                            ) : (
                                <>
                                    {item.val}
                                    {item.em && <em className="text-[#00AEEF] not-italic">{item.em}</em>}
                                </>
                            )}
                        </div>
                        <div className="text-[0.62rem] font-bold text-white/40 uppercase tracking-[0.1em]">{item.label}</div>
                        <div className="text-[0.65rem] text-white/25 mt-0.5">{item.meta}</div>
                    </div>
                ))}
            </div>

            {/* Business Performance Band */}
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
    );
};
