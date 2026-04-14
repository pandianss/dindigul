import React, { useState, useEffect } from 'react';
import { Award, Lock, User, Calendar, Clock, Hash, Save, ShieldAlert, TrendingUp } from 'lucide-react';

interface Signatory {
    name: string;
    nameTa?: string;
    nameHi?: string;
    titleEn: string;
    titleTa?: string;
    titleHi?: string;
}

interface DocumentPreviewProps {
    title: string;
    titleHi?: string;
    titleTa?: string;
    subTitle?: string;
    refNo: string;
    date: string;
    bodyHtml: string;
    initiator?: Signatory;
    reviewers?: Signatory[];
    approver?: Signatory;
    organization: any;
    deptSealSrc?: string;
    initialSealPos?: { x: number, y: number };
    onSaveSealPos?: (pos: { x: number, y: number }) => void;
    hideApprovedStatus?: boolean;
    dailyMovement?: any[];
    cashData?: any[];
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
    title, titleHi, titleTa, subTitle, refNo, date, bodyHtml,
    initiator, reviewers, approver, organization: org,
    deptSealSrc, initialSealPos, onSaveSealPos, hideApprovedStatus,
    dailyMovement, cashData
}) => {
    const [isMovingSeal, setIsMovingSeal] = useState(false);
    const [sealPos, setSealPos] = useState(initialSealPos || { x: 0, y: 30 });

    useEffect(() => {
        if (initialSealPos) setSealPos(initialSealPos);
    }, [initialSealPos]);

    const handleSealMove = (pos: { x: number, y: number }) => {
        setSealPos(pos);
    };

    const fmt = (num: any) => Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // Process Metrics
    const cdRatioMetric = dailyMovement?.find(m => m.metricKey === 'CDRatio' || m.metricKey === 'CD_Ratio');
    const profitMetric = dailyMovement?.find(m => m.metricKey === 'Profit');

    return (
        <div className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-bank-teal/20 max-w-5xl mx-auto flex flex-col h-[85vh]">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-2">
                    <div className="p-2 bg-bank-navy text-white rounded-lg">
                        <Award size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-bank-navy uppercase tracking-wider">High Fidelity Document Preview</h3>
                        <p className="text-[10px] text-gray-400 font-bold tracking-tighter">Unified Layout Engine (Matches Export)</p>
                    </div>
                </div>
                
                <div className="flex items-center space-x-2">
                    {deptSealSrc && (
                        <>
                            <button
                                onClick={() => setIsMovingSeal(!isMovingSeal)}
                                className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${
                                    isMovingSeal 
                                    ? 'bg-bank-teal text-white ring-2 ring-bank-teal ring-offset-2 shadow-lg scale-105' 
                                    : 'bg-white text-bank-navy border border-gray-200 hover:border-bank-teal hover:bg-bank-teal/5'
                                }`}
                            >
                                <Award size={14} />
                                {isMovingSeal ? 'DONE MOVING' : 'MOVE SEAL'}
                            </button>
                            {isMovingSeal && (
                                <button
                                    onClick={() => {
                                        onSaveSealPos?.(sealPos);
                                        setIsMovingSeal(false);
                                    }}
                                    className="px-4 py-2 bg-bank-navy text-white rounded-lg font-bold text-xs hover:shadow-lg transition-all flex items-center gap-2"
                                >
                                    <Save size={14} />
                                    <span>SAVE POSITION</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-y-auto p-12 bg-gray-100/30 document-preview-canvas font-['Inter',_sans-serif]">
                <div className="bg-white w-full min-h-full shadow-sm p-12 relative mx-auto overflow-hidden print:shadow-none" style={{ minWidth: '794px' }}>
                    
                    {/* Header - Advanced Trilingual Grid */}
                    <div className="border-b-[0.5px] border-bank-navy/40 pb-4 mb-4">
                        <div className="flex items-center gap-4 mb-3">
                            <img src="/assets/logo_center.svg" alt="logo" className="h-16 w-16 object-contain" />
                            <div className="space-y-0">
                                <h1 className="text-lg font-bold text-bank-navy leading-tight font-hindi">{org.bankNameHi}</h1>
                                <h1 className="text-xs font-bold text-bank-navy leading-tight font-tamil">{org.bankNameTa}</h1>
                                <h1 className="text-xl font-black text-bank-navy leading-tight uppercase tracking-tight">{org.bankNameEn}</h1>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 divide-x divide-gray-100 mt-4 text-center">
                            <div className="px-2">
                                <p className="text-[10px] font-bold text-[#800000] font-hindi mb-0.5">{org.officeNameHi}</p>
                                <p className="text-[9px] text-[#800000] font-hindi leading-tight opacity-80">{org.addressHi}</p>
                            </div>
                            <div className="px-2">
                                <p className="text-[10px] font-bold text-[#800000] font-tamil mb-0.5">{org.officeNameTa}</p>
                                <p className="text-[9px] text-[#800000] font-tamil leading-tight opacity-80">{org.addressTa}</p>
                            </div>
                            <div className="px-2">
                                <p className="text-[10.5px] font-black text-[#800000] uppercase mb-0.5">{org.officeNameEn}</p>
                                <p className="text-[9px] text-[#800000] leading-tight opacity-80">{org.addressEn}</p>
                            </div>
                        </div>

                        <div className="flex justify-center gap-8 text-[11px] font-bold text-[#800000] mt-3 pt-3 border-t border-gray-50 uppercase tracking-widest">
                            <span>Phone: {org.phone}</span>
                            <span>Email: {org.email}</span>
                        </div>
                    </div>

                    {/* Metadata (Ref/Date) */}
                    <div className="flex justify-between items-start mb-4 text-[13px] font-bold text-bank-navy">
                        <div className="flex items-start space-x-1.5 uppercase">
                            <span>REF: {refNo || 'PENDING'}</span>
                        </div>
                        <div className="flex items-start space-x-1.5 uppercase">
                            <span className="font-hindi text-xs">दिनांक</span> / <span className="font-tamil text-[10px]">தேதி</span> / DATE: {org.letterDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')}
                        </div>
                    </div>

                    {/* Titles */}
                    <div className="text-center mb-6">
                        <div className="inline-block border-b-2 border-bank-navy/10 px-8 pb-3">
                            {titleHi && <h3 className="text-[15px] font-bold text-gray-900 mb-1 font-hindi">{titleHi}</h3>}
                            {titleTa && <h3 className="text-[13px] font-bold text-gray-900 mb-1 font-tamil">{titleTa}</h3>}
                            <h3 className="text-xl font-black text-bank-navy uppercase">{title}</h3>
                            {subTitle && <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-wide italic">{subTitle}</p>}
                        </div>
                    </div>

                    {/* Recipient Block */}
                    <div className="mb-6 space-y-0.5 text-[14px] font-bold text-[#1e293b]">
                        <p>To,</p>
                        <p>The Branch Manager,</p>
                        <p>{org.bankNameEn},</p>
                        <p>Branch Office [Code: {refNo?.split('/')?.[3] || '****'}]</p>
                    </div>

                    {/* Summary Boxes Row */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        {cdRatioMetric && (
                            <div className="p-5 bg-slate-50/80 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 text-slate-200">
                                    <ShieldAlert size={32} />
                                </div>
                                <div className="font-black text-[9px] text-slate-400 mb-4 tracking-[0.2em] relative z-10 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-bank-navy opacity-40"></div>
                                    LIQUIDITY RISK SUMMARY
                                </div>
                                <div className="flex justify-between items-end relative z-10">
                                    <div>
                                        <div className="text-2xl font-black text-bank-navy flex items-baseline gap-2">
                                            {cdRatioMetric.latestValue?.toFixed(2)}%
                                            <span className="text-xs font-bold text-gray-400 font-normal underline decoration-dashed decoration-gray-300">CD Ratio</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Previous: {cdRatioMetric.previousValue?.toFixed(2)}%</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${cdRatioMetric.breached ? 'bg-red-100 text-red-700' : 'bg-bank-teal/10 text-bank-teal'}`}>
                                            {cdRatioMetric.breached ? 'THREAT LEVEL: HIGH' : 'LIQUIDITY: STABLE'}
                                        </span>
                                        <p className="text-[10px] text-gray-400 mt-1 font-bold">Safety Threshold: &lt; 85.00%</p>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-100 text-[9px] text-gray-400 font-bold uppercase tracking-wide leading-none">
                                    Note: CD Ratio measures core deposit utilization for lending. High ratios signal liquidity saturation.
                                </div>
                            </div>
                        )}

                        {profitMetric && (
                            <div className={`p-5 ${profitMetric.latestValue >= 0 ? 'bg-blue-50/50' : 'bg-red-50/50'} rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden`}>
                                <div className={`absolute top-0 right-0 p-3 ${profitMetric.latestValue >= 0 ? 'text-blue-100' : 'text-red-100'}`}>
                                    <TrendingUp size={32} />
                                </div>
                                <div className="font-black text-[9px] text-slate-400 mb-4 tracking-[0.2em] relative z-10 flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${profitMetric.latestValue >= 0 ? 'bg-blue-600' : 'bg-red-600'} opacity-40`}></div>
                                    PROFITABILITY POSITION
                                </div>
                                <div className="flex justify-between items-end relative z-10">
                                    <div>
                                        <div className={`text-2xl font-black ${profitMetric.latestValue >= 0 ? 'text-blue-700' : 'text-red-700'} flex items-baseline gap-2`}>
                                            ₹ {fmt(profitMetric.latestValue)} Cr
                                            <span className="text-xs font-bold text-gray-400 font-normal underline decoration-dashed decoration-gray-300">{profitMetric.latestValue >= 0 ? 'Net Profit' : 'Net Loss'}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Status: {profitMetric.latestValue >= 0 ? 'FAVORABLE' : 'ACTION REQUIRED'}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${profitMetric.latestValue >= 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                            {profitMetric.latestValue >= 0 ? '✓ PROFITABLE' : '⚠ LOSS MAKING'}
                                        </span>
                                        <p className="text-[10px] text-gray-400 mt-1 font-bold">Daily P&L Monitoring</p>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-100 text-[9px] text-gray-400 font-bold uppercase tracking-wide leading-none">
                                    Note: Continuous monitoring of daily profit/loss to ensure operational efficiency and branch viability.
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Body */}
                    <div 
                        className="text-[14.5px] leading-[1.6] text-justify mb-8 text-black"
                        dangerouslySetInnerHTML={{ __html: bodyHtml }}
                        style={{ padding: 0 }}
                    />

                    {/* Cash Management Table */}
                    {cashData && cashData.length > 0 && (
                        <div className="mb-8 p-4 bg-gray-50/30 rounded-xl border border-gray-100">
                             <div className="font-black text-xs text-bank-navy mb-3 border-b-2 border-bank-navy/10 pb-2 uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp size={14} />
                                Cash Management Summary
                             </div>
                             <table className="w-full text-center border-collapse text-[10.5px]">
                                <thead>
                                    <tr className="bg-gray-100/80 font-bold uppercase text-gray-500">
                                        <th className="p-2 border border-gray-200 text-left">Parameter</th>
                                        <th className="p-2 border border-gray-200">Current</th>
                                        <th className="p-2 border border-gray-200">Budget/CRL</th>
                                        <th className="p-2 border border-gray-200">Variance</th>
                                        <th className="p-2 border border-gray-200">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cashData.map((row: any, i: number) => {
                                        const cur = Number(row.val_current || 0);
                                        const bud = Number(row.budget_month || 0);
                                        const varVal = cur - bud;
                                        const isExcess = ['CASH_TOTAL', 'CASH_EXCESS'].includes(row.parameter) && cur > bud;
                                        return (
                                            <tr key={i} className="font-bold">
                                                <td className="p-2 border border-gray-200 text-left bg-gray-50/50">{row.metadata?.displayName || row.parameter}</td>
                                                <td className="p-2 border border-gray-200 text-bank-navy">₹ {fmt(cur)} Cr</td>
                                                <td className="p-2 border border-gray-200">₹ {fmt(bud)} Cr</td>
                                                <td className={`p-2 border border-gray-200 ${varVal > 0 ? 'text-red-600' : 'text-green-600'}`}>{varVal > 0 ? '+' : ''}{fmt(varVal)}</td>
                                                <td className={`p-2 border border-gray-200 ${isExcess ? 'text-red-700' : 'text-green-700'}`}>
                                                    <span className={`px-2 py-0.5 rounded uppercase text-[9px] ${isExcess ? 'bg-red-50' : 'bg-green-50'}`}>{isExcess ? 'BREACHED' : 'ADEQUATE'}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                             </table>
                        </div>
                    )}

                    {/* Signatures Container */}
                    <div className="signatures-root relative mt-12 min-h-[220px]">
                        
                        {/* Row 1 (Initiator) */}
                        <div className="flex justify-between items-start w-full mb-8">
                            {initiator && (
                                <div className="text-center w-[175px] relative z-20">
                                    <div className="border-t-[1.5px] border-gray-400 mb-1 pt-1"></div>
                                    <div className="text-bank-navy font-bold text-[11.5px] space-y-0.5">
                                        {initiator.nameHi && <p className="font-hindi tracking-tighter text-[10px]">({initiator.nameHi})</p>}
                                        {initiator.nameTa && <p className="font-tamil tracking-tighter text-[9px]">({initiator.nameTa})</p>}
                                        <p>({initiator.name})</p>
                                    </div>
                                    <div className="text-gray-500 font-bold text-[10px] space-y-0.5 leading-tight">
                                        {initiator.titleHi && <p className="font-hindi">{initiator.titleHi}</p>}
                                        {initiator.titleTa && <p className="font-tamil text-[9px]">{initiator.titleTa}</p>}
                                        <p className="uppercase">{initiator.titleEn}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Row 2 (Reviewers + Approver) */}
                        <div className="flex justify-between items-start w-full flex-wrap gap-x-8 gap-y-12">
                            <div className="flex flex-wrap gap-x-8 gap-y-12 flex-1">
                                {reviewers?.map((rev, idx) => (
                                    <div key={idx} className="text-center w-[175px] relative z-20">
                                        <div className="border-t-[1.5px] border-gray-400 mb-1 pt-1"></div>
                                        <div className="text-bank-navy font-bold text-[11.5px] space-y-0.5">
                                            {rev.nameHi && <p className="font-hindi tracking-tighter text-[10px]">({rev.nameHi})</p>}
                                            {rev.nameTa && <p className="font-tamil tracking-tighter text-[9px]">({rev.nameTa})</p>}
                                            <p>({rev.name})</p>
                                        </div>
                                        <div className="text-gray-500 font-bold text-[10px] space-y-0.5 leading-tight">
                                            {rev.titleHi && <p className="font-hindi">{rev.titleHi}</p>}
                                            {rev.titleTa && <p className="font-tamil text-[9px]">{rev.titleTa}</p>}
                                            <p className="uppercase">{rev.titleEn}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {approver && (
                                <div className="text-center w-[175px] relative z-20 ml-auto">
                                    {!hideApprovedStatus && (
                                        <div className="absolute top-[-25px] left-0 right-0 text-[10px] font-black text-bank-teal uppercase whitespace-nowrap animate-pulse">
                                            अनुमोदित / Approved
                                        </div>
                                    )}
                                    <p className="text-[10px] text-gray-400 font-normal mb-1">Sd/-</p>
                                    <div className="border-t-[1.5px] border-gray-400 mb-1 pt-1"></div>
                                    <div className="text-bank-navy font-bold text-[11.5px] space-y-0.5">
                                        {approver.nameHi && <p className="font-hindi tracking-tighter text-[10px]">({approver.nameHi})</p>}
                                        {approver.nameTa && <p className="font-tamil tracking-tighter text-[9px]">({approver.nameTa})</p>}
                                        <p>({approver.name})</p>
                                    </div>
                                    <div className="text-gray-500 font-bold text-[10px] space-y-0.5 leading-tight">
                                        {approver.titleHi && <p className="font-hindi">{approver.titleHi}</p>}
                                        {approver.titleTa && <p className="font-tamil text-[9px]">{approver.titleTa}</p>}
                                        <p className="uppercase">{approver.titleEn}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Draggable Seal Overlay */}
                        {deptSealSrc && (
                            <div 
                                className={`absolute w-[160px] h-[160px] transform -rotate-15 ${isMovingSeal ? 'cursor-move ring-4 ring-bank-teal ring-dashed bg-bank-teal/20 z-[100] opacity-[0.45] shadow-2xl' : 'pointer-events-none z-[10] opacity-[0.22]'}`}
                                style={{ 
                                    left: `${sealPos.x}%`, 
                                    top: `${sealPos.y}%`,
                                    transition: isMovingSeal ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                                onMouseDown={(e) => {
                                    if (!isMovingSeal) return;
                                    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                                    if (!rect) return;
                                    
                                    const handleMouseMove = (mmE: MouseEvent) => {
                                        const x = ((mmE.clientX - rect.left - 80) / rect.width) * 100;
                                        const y = ((mmE.clientY - rect.top - 80) / rect.height) * 100;
                                        handleSealMove({ 
                                            x: Math.max(-10, Math.min(x, 90)), 
                                            y: Math.max(-10, Math.min(y, 90)) 
                                        });
                                    };
                                    
                                    const handleMouseUp = () => {
                                        window.removeEventListener('mousemove', handleMouseMove);
                                        window.removeEventListener('mouseup', handleMouseUp);
                                    };
                                    
                                    window.addEventListener('mousemove', handleMouseMove);
                                    window.addEventListener('mouseup', handleMouseUp);
                                }}
                            >
                                <img 
                                    src={deptSealSrc} 
                                    alt="Seal" 
                                    className="w-full h-full object-contain select-none pointer-events-none drop-shadow-lg"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentPreview;
