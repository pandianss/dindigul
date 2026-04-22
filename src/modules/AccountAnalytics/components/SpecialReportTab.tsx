import React from 'react';
import { 
    Trophy, RefreshCw, Download, Users, TrendingUp, IndianRupee, 
    CreditCard, BarChart3, Award, ArrowUpRight, ArrowDownRight, AlertCircle 
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { formatNumber, formatCurrency } from '../utils';

interface SpecialReportTabProps {
    specialReport: any;
    reportPeriod: 'month' | 'fy';
    setReportPeriod: (p: 'month' | 'fy') => void;
    fetchSpecialReport: (p: 'month' | 'fy') => void;
    reportLoading: boolean;
    downloadReportAsImage: (key?: string) => void;
    downloadingMetric: string | null;
    handleReprocessAll: () => void;
    reprocessing: boolean;
    reportRef: React.RefObject<HTMLDivElement>;
}

export const SpecialReportTab: React.FC<SpecialReportTabProps> = ({
    specialReport,
    reportPeriod,
    setReportPeriod,
    fetchSpecialReport,
    reportLoading,
    downloadReportAsImage,
    downloadingMetric,
    handleReprocessAll,
    reprocessing,
    reportRef
}) => {
    const metrics = [
        { key: 'sbNetOpening', label: 'SB Net Account Opening', valueKey: 'sbNet', color: 'bank-teal', icon: Users, unit: 'Accounts', format: (v: number) => formatNumber(v) },
        { key: 'cdNetOpening', label: 'CD Net Account Opening', valueKey: 'cdNet', color: 'bank-gold', icon: TrendingUp, unit: 'Accounts', format: (v: number) => formatNumber(v) },
        { key: 'avgBalance', label: 'Average Balance (SB)', valueKey: 'avgBalance', color: 'blue-600', icon: IndianRupee, unit: '₹', format: (v: number) => formatCurrency(v) },
        { key: 'cdAvgBalance', label: 'Average Balance (CD)', valueKey: 'cdAvgBalance', color: 'purple-600', icon: CreditCard, unit: '₹', format: (v: number) => formatCurrency(v) },
        { key: 'sbNetRate', label: 'SB Net Rate (Accts/Day)', valueKey: 'sbRate', color: 'indigo-600', icon: BarChart3, unit: '/Day', format: (v: number) => v.toFixed(2) },
        { key: 'cdNetRate', label: 'CD Net Rate (Accts/Mo)', valueKey: 'cdRate', color: 'purple-600', icon: Award, unit: '/Mo', format: (v: number) => v.toFixed(2) },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            {/* Controls bar */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-black text-bank-navy uppercase tracking-widest flex items-center space-x-2">
                        <Trophy size={16} className="text-bank-gold" />
                        <span>Special Performance Report</span>
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest">
                        Top 10 &amp; Bottom 10 Branches — {specialReport ? `${specialReport.totalBranches} branches ranked` : 'Loading...'}
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                        {(['month', 'fy'] as const).map(p => (
                            <button key={p}
                                onClick={() => { setReportPeriod(p); fetchSpecialReport(p); }}
                                className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                    reportPeriod === p ? "bg-white text-bank-navy shadow-sm" : "text-gray-400 hover:text-bank-navy")}
                            >{p === 'month' ? 'Monthly' : `FY ${specialReport?.fyKey || ''}`}</button>
                        ))}
                    </div>
                    <button onClick={() => fetchSpecialReport(reportPeriod)}
                        className="flex items-center space-x-1 px-4 py-2 bg-gray-100 text-bank-navy rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all">
                        <RefreshCw size={12} className={reportLoading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                    <button onClick={() => downloadReportAsImage()}
                        disabled={!specialReport || reportLoading || !!downloadingMetric}
                        className="flex items-center space-x-1 px-4 py-2 bg-bank-navy text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-bank-navy/90 transition-all disabled:opacity-50 shadow-md">
                        {downloadingMetric === 'all' ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                        <span>Download Full Image</span>
                    </button>
                    <button onClick={handleReprocessAll} disabled={reprocessing}
                        title="Re-process all data with corrected date parsing"
                        className="flex items-center space-x-1 px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all disabled:opacity-50">
                        <RefreshCw size={12} className={reprocessing ? 'animate-spin' : ''} />
                        <span>{reprocessing ? 'Processing...' : 'Re-Process'}</span>
                    </button>
                </div>
            </div>

            {reportLoading && (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-bank-gold/20 border-t-bank-gold rounded-full animate-spin" />
                </div>
            )}

            {specialReport && !reportLoading && (
                <div ref={reportRef} className="space-y-8 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                    {/* Report Header */}
                    <div className="flex items-center justify-between pb-6 border-b-2 border-bank-navy/5">
                        <div>
                            <h2 className="text-xl font-black text-bank-navy uppercase tracking-tight">Branch Performance — Special Report</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                Period: {reportPeriod === 'month' ? specialReport.monthKey : `FY ${specialReport.fyKey}`}
                                &nbsp;|&nbsp; Generated: {new Date(specialReport.generatedAt).toLocaleString('en-IN')}
                                &nbsp;|&nbsp; {specialReport.totalBranches} Branches Ranked
                                &nbsp;—&nbsp; {specialReport.regionName}
                            </p>
                        </div>
                        <div className="flex items-center space-x-2 bg-bank-gold/10 px-4 py-2 rounded-xl">
                            <Trophy size={18} className="text-bank-gold" />
                            <span className="text-[10px] font-black text-bank-gold uppercase tracking-widest">DINDIGUL REGIONAL OFFICE</span>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start space-x-3">
                        <AlertCircle size={16} className="text-amber-500 mt-0.5" />
                        <div className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">
                            <p>Data Accuracy Note: Historical date discrepancies have been resolved.</p>
                        </div>
                    </div>

                    {metrics.map(metric => {
                        const data = specialReport[metric.key];
                        if (!data) return null;
                        const Icon = metric.icon;
                        const maxTop = Math.max(...data.top.map((b: any) => Math.abs(b[metric.valueKey] || 0)), 1);
                        const maxBot = Math.max(...data.bottom.map((b: any) => Math.abs(b[metric.valueKey] || 0)), 1);
                        return (
                            <div key={metric.key} className="space-y-4 group/metric">
                                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                    <div className="flex items-center space-x-2">
                                        <div className={`p-1.5 bg-${metric.color}/10 rounded-lg`}>
                                            <Icon size={14} className={`text-${metric.color}`} />
                                        </div>
                                        <h4 className="text-xs font-black text-bank-navy uppercase tracking-widest">{metric.label}</h4>
                                    </div>
                                    <button 
                                        onClick={() => downloadReportAsImage(metric.key)}
                                        disabled={!!downloadingMetric}
                                        className="flex items-center space-x-1 px-3 py-1 bg-gray-50 text-[9px] font-black text-bank-navy uppercase tracking-widest rounded-lg border border-gray-100 hover:bg-white hover:shadow-sm transition-all disabled:opacity-50"
                                    >
                                        {downloadingMetric === metric.key ? <RefreshCw size={10} className="animate-spin" /> : <Download size={10} />}
                                        <span>Download Image</span>
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    {/* TOP 10 */}
                                    <div>
                                        <div className="flex items-center space-x-2 mb-3">
                                            <ArrowUpRight size={14} className="text-green-500" />
                                            <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Top 10 Performers</span>
                                        </div>
                                        <div className="space-y-2">
                                            {data.top.map((b: any, i: number) => {
                                                const val = b[metric.valueKey] || 0;
                                                const pct = Math.min((Math.abs(val) / maxTop) * 100, 100);
                                                return (
                                                    <div key={b.code} className="flex items-center space-x-3 group">
                                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 ${
                                                            i === 0 ? 'bg-bank-gold text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-700/50 text-amber-900' : 'bg-gray-100 text-gray-500'
                                                        }`}>{i + 1}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center space-x-2 mb-0.5">
                                                                <span className="text-[10px] font-black text-bank-navy truncate max-w-[120px]">{b.name}</span>
                                                                <span className="text-[10px] font-black text-green-600 flex-shrink-0">{metric.format(val)} {metric.unit !== '₹' && metric.unit !== 'Accounts' ? metric.unit : ''}</span>
                                                            </div>
                                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-green-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {/* BOTTOM 10 */}
                                    <div>
                                        <div className="flex items-center space-x-2 mb-3">
                                            <ArrowDownRight size={14} className="text-red-500" />
                                            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Bottom 10</span>
                                        </div>
                                        <div className="space-y-2">
                                            {data.bottom.map((b: any, i: number) => {
                                                const val = b[metric.valueKey] || 0;
                                                const pct = Math.min((Math.abs(val) / (maxBot || 1)) * 100, 100);
                                                return (
                                                    <div key={b.code} className="flex items-center space-x-3 group">
                                                        <span className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center text-[9px] font-black text-red-400 flex-shrink-0">{i + 1}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center space-x-2 mb-0.5">
                                                                <span className="text-[10px] font-black text-bank-navy truncate max-w-[120px]">{b.name}</span>
                                                                <span className="text-[10px] font-black text-red-500 flex-shrink-0">{metric.format(val)} {metric.unit !== '₹' && metric.unit !== 'Accounts' ? metric.unit : ''}</span>
                                                            </div>
                                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-red-300 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
