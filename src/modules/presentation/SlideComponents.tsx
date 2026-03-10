import React from 'react';
import type { PresentationData } from '../../hooks/usePresentationData';
import type { SlideConfig } from '../../types/presentation';
import { BarChart, Bar, XAxis, YAxis, LabelList, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import { Shield } from 'lucide-react';

interface SlideProps {
    data: PresentationData;
    slide: SlideConfig;
    slideNumber: number;
    totalSlides: number;
}

// Formatting helpers
const fmtCr = (v: number) => `₹${(v / 100).toFixed(2)} Cr`;
const fmtGrowth = (v: number) => `${v >= 0 ? '+' : ''}${(v / 100).toFixed(2)} Cr`;
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
const truncBranch = (name: string, n = 20) => name.length > n ? name.slice(0, n - 1) + '…' : name;

const isRateMetric = (metric: string) => {
    const lower = metric.toLowerCase();
    return lower.includes('%') || lower.includes('ratio') || lower.includes('yield') || lower.includes('cost');
};

const fmtParamValue = (v: number, paramName: string) => {
    if (isRateMetric(paramName)) {
        return `${v.toFixed(2)}`;
    }
    return fmtCr(v);
};

const fmtParamGrowth = (v: number, paramName: string) => {
    if (isRateMetric(paramName)) {
        return `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
    }
    return fmtGrowth(v);
};

// Base Slide Wrapper (handles common aspects like background, aspect ratio, slide number, annotation)
const BaseSlide: React.FC<{ children: React.ReactNode; annotation?: string; slideNumber?: number; totalSlides?: number }> = ({ children, annotation, slideNumber, totalSlides }) => {
    return (
        <div className="w-full bg-gradient-to-br from-[#0d1b4b] via-bank-navy to-[#0d1b4b] text-white overflow-hidden relative" style={{ aspectRatio: '16/9' }}>
            <div className="absolute inset-0 z-0 radial-gradient pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.2) 0%, transparent 50%)' }} />

            <div className="relative z-10 w-full h-full p-12 flex flex-col">
                {children}
            </div>

            {/* Annotation Overlay */}
            {annotation && (
                <div className="absolute bottom-12 left-12 z-20 max-w-lg bg-black/60 backdrop-blur-md border-l-4 border-bank-gold p-4 shadow-xl rounded-r-lg">
                    <p className="text-bank-gold slide-display italic text-xl leading-relaxed">{annotation}</p>
                </div>
            )}

            {/* Slide Number */}
            {slideNumber && totalSlides && (
                <div className="absolute bottom-6 right-8 text-gray-400 slide-mono text-sm opacity-60">
                    {slideNumber} / {totalSlides}
                </div>
            )}
        </div>
    );
};

export const CoverSlide: React.FC<SlideProps> = ({ data, slide, slideNumber, totalSlides }) => {
    // Format date as DD MMM YYYY (approximate, since Native Date is local, doing simple fallback)
    const d = new Date(data.date);
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <BaseSlide annotation={slide.annotation} slideNumber={slideNumber} totalSlides={totalSlides}>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Shield className="w-32 h-32 text-bank-gold mb-12 opacity-90 drop-shadow-lg" />
                <h1 className="text-7xl font-bold slide-display text-bank-gold mb-6 tracking-tight drop-shadow-md">
                    {slide.title || 'Regional Performance Review'}
                </h1>
                <h2 className="text-4xl text-blue-100 font-light slide-display tracking-wide mb-16 opacity-90">
                    {data.period} · Dindigul Regional Office
                </h2>
                <div className="flex items-center gap-8 mt-auto mb-10 text-xl slide-mono text-blue-200 uppercase tracking-widest font-semibold opacity-80 border-t border-blue-800/50 pt-8 w-2/3 justify-center">
                    <span>{data.branchCount} Branches</span>
                    <span className="w-2 h-2 rounded-full bg-bank-gold" />
                    <span>{dateStr}</span>
                </div>
            </div>
        </BaseSlide>
    );
};

export const RegionalKpiSlide: React.FC<SlideProps> = ({ data, slide, slideNumber, totalSlides }) => {
    return (
        <BaseSlide annotation={slide.annotation} slideNumber={slideNumber} totalSlides={totalSlides}>
            <h2 className="text-5xl font-bold slide-display text-bank-gold mb-12 border-b-2 border-blue-900/50 pb-6 shadow-sm">
                {slide.title || `Regional Highlights — ${data.period}`}
            </h2>

            <div className="grid grid-cols-4 gap-8 flex-1 content-start">
                {data.kpis.map((kpi: any) => (
                    <div key={kpi.parameterName} className="bg-[#1a2b6d]/50 backdrop-blur-sm border border-[#2a3d8c] rounded-xl p-8 flex flex-col shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none" />

                        <div className="text-blue-200 uppercase tracking-wider text-sm font-semibold mb-6 flex justify-between items-center pr-2">
                            {kpi.displayName}
                        </div>

                        <div className="slide-mono text-4xl font-bold text-white mb-6 tracking-tight flex items-baseline">
                            {fmtParamValue(kpi.total, kpi.parameterName)}
                            {isRateMetric(kpi.parameterName) && <span className="text-xl ml-1">%</span>}
                        </div>

                        <div className="mt-auto flex items-end justify-between border-t border-white/10 pt-4">
                            <div>
                                <div className="text-xs text-blue-300 uppercase tracking-wider mb-1">YTD Growth</div>
                                <div className={`font-semibold text-lg slide-mono ${kpi.growthFy >= 0 ? 'text-bank-teal' : 'text-red-400'}`}>
                                    {fmtParamGrowth(kpi.growthFy, kpi.parameterName)}
                                    {isRateMetric(kpi.parameterName) && <span className="text-xs ml-0.5">%</span>}
                                </div>
                            </div>
                            <div className={`px-3 py-1.5 rounded text-sm font-bold slide-mono ${kpi.growthFy >= 0 ? 'bg-bank-teal/20 text-bank-teal border border-bank-teal/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                {fmtPct(kpi.growthFyPct)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </BaseSlide>
    );
};

export const ParamHeaderSlide: React.FC<SlideProps> = ({ data, slide, slideNumber, totalSlides }) => {
    const ranking = data.rankings.find((r: any) => r.parameterName === slide.parameterName);
    if (!ranking) return null;

    return (
        <BaseSlide annotation={slide.annotation} slideNumber={slideNumber} totalSlides={totalSlides}>
            <div className="flex-1 flex flex-col items-center justify-center text-center relative">
                <div className="uppercase tracking-[0.3em] font-bold text-bank-teal text-2xl mb-8">
                    {ranking.category}
                </div>
                <h1 className="text-8xl font-bold slide-display text-bank-gold mb-12 drop-shadow-xl" style={{ animation: 'shimmer 3s infinite linear', background: 'linear-gradient(90deg, #D4AF37 0%, #F3E5AB 50%, #D4AF37 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% auto' }}>
                    {slide.title || ranking.displayName}
                </h1>

                <div className="grid grid-cols-2 gap-16 mt-16 mt-auto mb-10 text-center w-3/5 bg-blue-900/30 backdrop-blur-md rounded-2xl p-8 border border-blue-500/20">
                    <div>
                        <div className="text-blue-300 uppercase tracking-widest text-sm mb-3">Regional Total</div>
                        <div className="slide-mono text-4xl font-bold text-white flex justify-center items-baseline gap-1">
                            {fmtParamValue(ranking.regionalTotal, ranking.parameterName)}
                            {isRateMetric(ranking.parameterName) && <span className="text-2xl">%</span>}
                        </div>
                    </div>
                    <div className="border-l border-blue-500/30 pl-16">
                        <div className="text-blue-300 uppercase tracking-widest text-sm mb-3">YTD Growth</div>
                        <div className={`slide-mono text-4xl font-bold flex justify-center items-baseline gap-1 ${ranking.regionalGrowthFy >= 0 ? 'text-bank-teal' : 'text-red-400'}`}>
                            {fmtParamGrowth(ranking.regionalGrowthFy, ranking.parameterName)}
                            {isRateMetric(ranking.parameterName) && <span className="text-2xl">%</span>}
                        </div>
                    </div>
                </div>
            </div>
        </BaseSlide>
    );
};

export const RankingSlide: React.FC<SlideProps> = ({ data, slide, slideNumber, totalSlides }) => {
    const ranking = data.rankings.find((r: any) => r.parameterName === slide.parameterName);
    if (!ranking) return null;

    const isTop10 = slide.type.includes('TOP10');
    const isPct = slide.type.includes('PCT');

    let rows: any[] = [];
    if (slide.type === 'TOP10_GROWTH') rows = ranking.top10ByGrowth;
    if (slide.type === 'TOP10_GROWTH_PCT') rows = ranking.top10ByGrowthPct;
    if (slide.type === 'BOTTOM10_GROWTH') rows = ranking.bottom10ByGrowth;
    if (slide.type === 'BOTTOM10_GROWTH_PCT') rows = ranking.bottom10ByGrowthPct;

    const chartData = rows.map((r: any) => ({
        name: truncBranch(r.branchName),
        value: isPct ? r.growth_fy_pct : r.growth_fy,
        displayValue: isPct ? fmtPct(r.growth_fy_pct) : fmtParamGrowth(r.growth_fy, ranking.parameterName),
        isPositive: isTop10 // True if top 10 (green), False if bottom 10 (red)
    })).filter((r: any) => r.value !== null && !isNaN(r.value));

    // Sort chart data ascending for rendering Top correctly from top to bottom
    const sortedChartData = [...chartData].sort((a, b) => b.value - a.value);
    if (!isTop10) sortedChartData.reverse(); // For bottom, we want worst at the top.

    const titlePrefix = isTop10 ? "Top 10 Branches by " : "Bottom 10 Branches by ";
    const rateSuffix = isRateMetric(ranking.parameterName) ? "%" : "(₹)";
    const titleSuffix = isPct ? "YTD Growth %" : `YTD Growth ${rateSuffix}`;
    const defaultTitle = `${ranking.displayName} — ${titlePrefix}${titleSuffix}`;

    return (
        <BaseSlide annotation={slide.annotation} slideNumber={slideNumber} totalSlides={totalSlides}>
            <div className="flex items-end justify-between mb-8 border-b-2 border-blue-900/50 pb-4">
                <h2 className="text-4xl font-bold slide-display text-bank-gold drop-shadow-sm">
                    {slide.title || defaultTitle}
                </h2>
                <div className="text-blue-200 uppercase tracking-widest font-semibold flex items-center gap-3 bg-blue-900/40 px-4 py-2 rounded-lg">
                    <span>{ranking.category}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>{data.period}</span>
                </div>
            </div>

            <div className="flex gap-12 flex-1 mt-4">
                {/* Left Panel: Table */}
                <div className="w-[42%] bg-black/20 backdrop-blur-sm border border-white/5 rounded-xl overflow-hidden flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    <div className="grid grid-cols-12 gap-2 text-xs uppercase tracking-wider text-blue-300 font-bold bg-[#14235b] p-4 border-b border-white/10">
                        <div className="col-span-2 text-center">Rnk</div>
                        <div className="col-span-5">Branch</div>
                        <div className="col-span-5 text-right opacity-80 pl-2">G. Amt &nbsp; / &nbsp; G. %</div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {rows.map((r: any, i: number) => {
                            const isGold = i === 0;
                            const isSilver = i === 1;
                            const isBronze = i === 2;

                            let badgeStyle = "bg-blue-900/50 text-blue-200 border border-blue-500/20";
                            if (isGold) badgeStyle = "bg-yellow-500 text-yellow-900 font-black shadow-[0_0_15px_rgba(234,179,8,0.5)] border border-yellow-300";
                            else if (isSilver) badgeStyle = "bg-gray-300 text-gray-800 font-black border border-white";
                            else if (isBronze) badgeStyle = "bg-amber-700 text-amber-100 font-bold border border-amber-600";

                            return (
                                <div key={r.branchCode} className="grid grid-cols-12 gap-2 items-center text-lg p-3 border-b border-light-blue-900/10 hover:bg-white/5 transition-colors">
                                    <div className="col-span-2 flex justify-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${badgeStyle}`}>
                                            {i + 1}
                                        </div>
                                    </div>
                                    <div className="col-span-5 truncate font-semibold font-sans tracking-wide pt-1">
                                        {r.branchName}
                                    </div>
                                    <div className="col-span-5 text-right pr-2">
                                        <div className={`slide-mono font-bold leading-tight ${r.growth_fy >= 0 ? 'text-bank-teal' : 'text-red-400'}`}>
                                            {fmtParamGrowth(r.growth_fy, ranking.parameterName)}
                                        </div>
                                        <div className={`text-sm slide-mono font-bold opacity-80 ${r.growth_fy_pct >= 0 ? 'text-bank-teal' : 'text-red-400'}`}>
                                            {fmtPct(r.growth_fy_pct)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Panel: Recharts Bar Chart */}
                <div className="flex-1 relative pt-4 pb-8 h-[95%]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sortedChartData} layout="vertical" margin={{ left: 10, right: 100, top: 0, bottom: 0 }} barCategoryGap="25%">
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={180} axisLine={false} tickLine={false} tick={{ fill: '#e2e8f0', fontSize: 16, fontFamily: 'IBM Plex Serif', fontWeight: 600 }} />
                            <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={1000}>
                                {sortedChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.isPositive ? '#00A693' : '#E53E3E'} />
                                ))}
                                <LabelList
                                    dataKey="value"
                                    position="right"
                                    formatter={(v: number) => isPct ? fmtPct(v) : fmtParamGrowth(v, ranking.parameterName)}
                                    style={{ fill: '#f8fafc', fontSize: 18, fontFamily: 'IBM Plex Mono', fontWeight: 700 }}
                                    offset={12}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </BaseSlide>
    );
};

export const CustomTextSlide: React.FC<SlideProps> = ({ slide, slideNumber, totalSlides }) => {
    const content = slide.customContent || { heading: 'Custom Slide', body: '' };
    const highlight = content.highlightColor || '#D4AF37'; // default gold

    return (
        <BaseSlide annotation={slide.annotation} slideNumber={slideNumber} totalSlides={totalSlides}>
            <div className="flex-1 flex flex-col justify-center">
                <div className="pl-12 py-6 border-l-[12px] shadow-sm rounded-sm" style={{ borderColor: highlight }}>
                    <h1 className="text-6xl font-bold slide-display mb-10 text-white drop-shadow-md tracking-tight">
                        {content.heading}
                    </h1>
                    <div className="text-3xl font-light leading-relaxed text-blue-50 opacity-90 whitespace-pre-wrap max-w-5xl">
                        {content.body}
                    </div>
                </div>
            </div>
        </BaseSlide>
    );
};

// Main renderer based on type
export const SlideRenderer: React.FC<SlideProps> = (props) => {
    switch (props.slide.type) {
        case 'COVER': return <CoverSlide {...props} />;
        case 'REGIONAL_KPI': return <RegionalKpiSlide {...props} />;
        case 'PARAM_HEADER': return <ParamHeaderSlide {...props} />;
        case 'TOP10_GROWTH':
        case 'TOP10_GROWTH_PCT':
        case 'BOTTOM10_GROWTH':
        case 'BOTTOM10_GROWTH_PCT':
            return <RankingSlide {...props} />;
        case 'CUSTOM_TEXT': return <CustomTextSlide {...props} />;
        default: return <div className="text-white">Unknown slide type</div>;
    }
};
