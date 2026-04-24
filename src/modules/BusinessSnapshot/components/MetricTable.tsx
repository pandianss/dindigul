import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { MisSnapshot, SnapshotPanelData } from '../types';
import { formatValue, getStatusStyle, isRateMetric, calcPctVar } from '../utils';

interface MetricTableProps {
    cat: string;
    items: SnapshotPanelData[];
    snapshot: MisSnapshot;
    headerDates: any;
}

const GrowthIndicator = ({ val, isInverse = false, isPercent = false }: { val: number, isInverse?: boolean, isPercent?: boolean }) => {
    if (Math.abs(val) < 0.01) return <span className="text-slate-200 font-medium">0.00</span>;
    const isPositive = isInverse ? val <= 0 : val >= 0;
    const colorClass = isPositive ? 'text-bank-teal' : 'text-rose-500';

    return (
        <div className={`flex items-center justify-end gap-0.5 ${colorClass}`}>
            <span className="font-bold text-[14px] font-mono tabular-nums tracking-tighter">{formatValue(Math.abs(val), isPercent)}</span>
            {val >= 0 ? <ArrowUpRight className="w-4 h-4 stroke-[2.5]" /> : <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />}
        </div>
    );
};

export const MetricTable: React.FC<MetricTableProps> = ({ cat, items, snapshot, headerDates }) => {
    const isRegional = ['RO', 'LPC', 'REGIONAL OFFICE'].includes(snapshot.branch?.type?.toUpperCase() || '');

    const findParent = (paramName: string) => {
        const p = items.find(item => item.parameter === paramName);
        const parentName = p?.metadata?.parentParameterName;
        if (!parentName) return null;
        return items.find(item => item.parameter === parentName);
    };

    const getDepth = (paramName: string, currentDepth: number = 0): number => {
        const parent = findParent(paramName);
        if (!parent || (parent.metadata?.category || 'Uncategorized') !== cat) return currentDepth;
        return getDepth(parent.parameter, currentDepth + 1);
    };

    const getBranchRoot = (paramName: string): string | null => {
        const roots = ['Core Ret', 'Core_Agri', 'MSME', 'Gold', 'Adv', 'Total Dep', 'Bus'];
        if (roots.includes(paramName)) return paramName;
        const parent = findParent(paramName);
        if (!parent) return null;
        return getBranchRoot(parent.parameter);
    };

    // Recursive sorting to ensure children follow parents
    const sortedItems: SnapshotPanelData[] = [];
    const visited = new Set<string>();

    const addRecursive = (param: SnapshotPanelData) => {
        if (visited.has(param.parameter)) return;
        visited.add(param.parameter);
        sortedItems.push(param);
        
        // Find children
        const children = items.filter(i => i.metadata?.parentParameterName === param.parameter);
        children.forEach(addRecursive);
    };

    // Start with root elements (those with no parent or parent not in this category)
    items.filter(i => {
        const parentName = i.metadata?.parentParameterName;
        const parentInCat = parentName && items.some(p => p.parameter === parentName);
        return !parentInCat;
    }).forEach(addRecursive);

    // Safety for any orphans
    items.forEach(i => {
        if (!visited.has(i.parameter)) addRecursive(i);
    });

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 mb-8 last:mb-0">
            <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center group">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-bank-navy text-white rounded-2xl shadow-lg shadow-bank-navy/10 group-hover:scale-110 transition-transform duration-300">
                        <span className="text-xs font-bold">{cat.substring(0, 4)}</span>
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-bank-navy uppercase tracking-widest">{cat}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{items.length} KPIs Tracked</p>
                    </div>
                </div>
                <div className={`px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-2 ${snapshot.status === 'FINAL' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    <div className={`w-2 h-2 rounded-full ${snapshot.status === 'FINAL' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                    {snapshot.status}
                </div>
            </div>
            <div className="overflow-x-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-slate-200">
                <table className="w-full text-[14px] border-collapse whitespace-nowrap">
                    <thead className="sticky top-0 z-20 backdrop-blur-md bg-white/95">
                        {cat === 'CASH' ? (
                            <>
                                <tr className="text-slate-400 font-black uppercase tracking-[0.2em] text-[11px]">
                                    <th rowSpan={2} className="px-6 py-4 text-left border-r border-slate-100 bg-white min-w-[300px]">Cash Parameters</th>
                                    <th rowSpan={2} className="px-6 py-4 text-right border-r border-slate-100 border-t-2 border-indigo-400 bg-slate-50/50">Authorized CRL (Limit)</th>
                                    <th rowSpan={2} className="px-6 py-4 text-right border-r border-slate-100 border-t-2 border-bank-navy bg-slate-50/50">Current Possession</th>
                                    <th colSpan={2} className="px-6 py-2 text-center border-r border-slate-100 border-t-2 border-rose-500 bg-slate-50/50">Risk Assessment</th>
                                    <th rowSpan={2} className="px-6 py-4 text-center border-t-2 border-amber-400 bg-slate-50/50">Status</th>
                                </tr>
                                <tr className="border-b border-slate-100 bg-white text-slate-500 font-bold shadow-sm">
                                    <th className="px-4 py-3 text-right border-r border-slate-50 uppercase text-[10px]">Excess / (Shortfall)</th>
                                    <th className="px-4 py-3 text-right border-r border-slate-100 uppercase text-[10px]">Variance %</th>
                                </tr>
                            </>
                        ) : (
                            <>
                                <tr className="text-slate-400 font-black uppercase tracking-[0.2em] text-[11px]">
                                    <th rowSpan={2} className="px-6 py-4 text-left border-r border-slate-100 bg-white min-w-[220px]">Parameters</th>
                                    <th colSpan={4} className="px-6 py-2 text-center border-r border-slate-100 border-t-2 border-slate-400 bg-slate-50/50">Historical Performance</th>
                                    <th colSpan={3} className="px-6 py-2 text-center border-r border-slate-100 border-t-2 border-bank-navy bg-slate-50/50">Current Trajectory</th>
                                    <th colSpan={4} className="px-6 py-2 text-center border-r border-slate-100 border-t-2 border-bank-teal bg-slate-50/50">Dynamic Variance</th>
                                    <th colSpan={3} className="px-6 py-2 text-center border-r border-slate-100 border-t-2 border-indigo-400 bg-slate-50/50">Monthly Objectives</th>
                                    <th colSpan={2} className="px-6 py-2 text-center border-t-2 border-amber-400 bg-slate-50/50">Quarterly Target</th>
                                </tr>
                                <tr className="border-b border-slate-100 bg-white text-slate-500 font-bold shadow-sm">
                                    <th className="px-4 py-3 text-right border-r border-slate-50">{headerDates?.prevFyStart}</th>
                                    <th className="px-4 py-3 text-right border-r border-slate-50">{headerDates?.prevFyEnd}</th>
                                    <th className="px-4 py-3 text-right border-r border-slate-50 text-slate-400 font-base uppercase text-[10px]">Var</th>
                                    <th className="px-4 py-3 text-right border-r border-slate-100 text-slate-400 font-base uppercase text-[10px]">Var %</th>

                                    <th className="px-4 py-3 text-right border-r border-slate-50">{headerDates?.monthEnd}</th>
                                    <th className="px-4 py-3 text-right border-r border-slate-50">{headerDates?.yesterday}</th>
                                    <th className="px-4 py-3 text-right border-r border-slate-100 font-black text-bank-navy bg-blue-50/50 ring-1 ring-inset ring-blue-100">{headerDates?.current}</th>

                                    <th className="px-4 py-3 text-right border-r border-slate-50 uppercase text-[10px]">Daily</th>
                                    <th className="px-4 py-3 text-right border-r border-slate-50 uppercase text-[10px]">MTD</th>
                                    <th className="px-4 py-3 text-right border-r border-slate-50 text-bank-teal uppercase text-[10px]">YTD</th>
                                    <th className="px-4 py-3 text-right border-r border-slate-100 font-bold text-bank-teal uppercase text-[10px]">YTD %</th>

                                    <th className="px-4 py-3 text-right border-r border-slate-50 text-[10px] uppercase">Budget</th>
                                    <th className="px-4 py-3 text-right border-r border-slate-50 text-indigo-600 text-[10px] uppercase">Gap</th>
                                    <th className="px-4 py-3 text-center border-r border-slate-100 text-[10px] uppercase">Status</th>

                                    <th className="px-4 py-3 text-right border-r border-slate-50 text-[10px] uppercase">Budget</th>
                                    <th className="px-4 py-3 text-right text-amber-600 text-[10px] uppercase">Gap</th>
                                </tr>
                            </>
                        )}
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium text-slate-600">
                        {sortedItems.map((row) => {
                            const isRate = isRateMetric(row.parameter);
                            const isInverse = ['NPA', 'EXPENSE', 'COST', 'PROVISION'].some(k => row.parameter.toUpperCase().includes(k));
                            const isPercentMetric = row.parameter.toUpperCase().includes('%') || row.parameter.toUpperCase().includes('RATIO');

                            const depth = getDepth(row.parameter);
                            const branchRoot = getBranchRoot(row.parameter);
                            const isRoot = row.parameter === 'Bus';
                            const isSubAggregate = ['Total Dep', 'Adv', 'Core Adv'].includes(row.parameter);
                            const isMajorCategory = ['Gold', 'Core Adv', 'Core Ret', 'Core_Agri', 'MSME'].includes(row.parameter);

                            let branchBg = '';
                            let branchSolidBg = '';
                            let branchBorder = '';
                            let branchParentBorder = '';
                            if (branchRoot === 'Core Ret') {
                                branchBg = 'bg-gradient-to-r from-indigo-50/50 to-transparent';
                                branchSolidBg = 'bg-[#f8faff]';
                                branchBorder = 'border-l-indigo-300';
                                branchParentBorder = 'border-l-indigo-600';
                            } else if (branchRoot === 'Core_Agri') {
                                branchBg = 'bg-gradient-to-r from-emerald-50/50 to-transparent';
                                branchSolidBg = 'bg-[#f8fff9]';
                                branchBorder = 'border-l-emerald-300';
                                branchParentBorder = 'border-l-emerald-600';
                            } else if (branchRoot === 'MSME') {
                                branchBg = 'bg-gradient-to-r from-sky-50/50 to-transparent';
                                branchSolidBg = 'bg-[#f8fbff]';
                                branchBorder = 'border-l-sky-300';
                                branchParentBorder = 'border-l-sky-600';
                            } else if (branchRoot === 'Gold') {
                                branchBg = 'bg-gradient-to-r from-amber-50/30 to-transparent';
                                branchSolidBg = 'bg-[#fffdf8]';
                                branchBorder = 'border-l-amber-200';
                                branchParentBorder = 'border-l-amber-500';
                            }

                            const rowClasses = `hover:bg-slate-50/80 transition-all group/row border-l-4 ${isMajorCategory ? (branchParentBorder || 'border-l-slate-400') : (branchBorder || 'border-l-transparent')} ${branchBg} ${isRoot ? 'bg-gradient-to-r from-blue-100/50 to-transparent border-l-4 border-l-bank-navy shadow-sm' : row.parameter === 'Gold' ? 'bg-gradient-to-r from-amber-50 to-transparent border-l-4 border-l-amber-400' : isSubAggregate ? 'bg-blue-50/30 border-l-4 border-l-bank-teal/50' : isMajorCategory ? 'shadow-[inset_4px_0_0_0_rgba(0,0,0,0.05)]' : ''}`;
                            const cellClasses = `px-6 py-3 border-r border-slate-100 sticky left-0 z-10 group-hover/row:bg-slate-50/80 ${isRoot ? 'bg-[#f0f4ff]' : row.parameter === 'Gold' ? 'bg-[#fffdf5]' : isSubAggregate ? 'bg-[#f5f9ff]' : (branchSolidBg || 'bg-white')}`;
                            const textClasses = `text-slate-800 group-hover/row:text-bank-navy transition-colors ${isRoot ? 'font-black text-[18px]' : (isSubAggregate || isMajorCategory) ? 'font-black text-[17px]' : 'font-bold text-[16px] leading-tight'}`;
                            const paddingClass = depth > 0 ? { paddingLeft: `${depth * 24}px` } : {};

                            return (
                                <tr key={row.id} className={rowClasses}>
                                    <td className={cellClasses}>
                                        <div className="flex items-center">
                                            {Array.from({ length: depth }).map((_, i) => (
                                                <div key={i} className="w-6 h-10 border-l border-slate-200 ml-2 first:ml-0" />
                                            ))}
                                            <div className={textClasses}>
                                                {row.metadata.displayName}
                                            </div>
                                        </div>
                                    </td>
                                    {cat === 'CASH' ? (
                                        <>
                                            <td className="px-4 py-3 text-right text-indigo-600 font-black border-r border-slate-50 bg-indigo-50/20">{formatValue(row.budget_month)}</td>
                                            <td className="px-4 py-3 text-right text-bank-navy font-black border-r border-slate-50">{formatValue(row.val_current)}</td>
                                            <td className={`px-4 py-3 text-right font-black border-r border-slate-50 ${row.val_current > row.budget_month ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                <GrowthIndicator val={row.val_current - row.budget_month} isInverse={true} />
                                            </td>
                                            <td className="px-4 py-3 text-right border-r border-slate-100 bg-slate-50/10">
                                                <GrowthIndicator val={calcPctVar(row.val_current - row.budget_month, row.budget_month)} isInverse={true} isPercent={true} />
                                            </td>
                                            <td className="px-4 py-3 border-r border-slate-100 text-center bg-indigo-50/5">
                                                <span className={`px-3 py-1 rounded text-[11px] font-black uppercase tracking-tighter ${getStatusStyle(row.status)} shadow-[0_1px_2px_rgba(0,0,0,0.1)] opacity-90`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-4 py-3 text-right text-slate-400 border-r border-slate-50">{formatValue(row.val_prev_fy_start, isPercentMetric)}</td>
                                            <td className="px-4 py-3 text-right text-slate-400 border-r border-slate-50">{formatValue(row.val_prev_fy_end, isPercentMetric)}</td>
                                            <td className="px-4 py-3 text-right border-r border-slate-50 bg-slate-50/10">
                                                {!isRate ? <GrowthIndicator val={row.growth_prev_fy} isInverse={isInverse} isPercent={isPercentMetric} /> : <span className="text-slate-200">-</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right border-r border-slate-100 bg-slate-50/20">
                                                {!isRate ? <GrowthIndicator val={calcPctVar(row.growth_prev_fy, row.val_prev_fy_start)} isInverse={isInverse} isPercent={true} /> : <span className="text-slate-200">-</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-500 border-r border-slate-50">{formatValue(row.val_prev_m_end, isPercentMetric)}</td>
                                            <td className="px-4 py-3 text-right text-slate-500 border-r border-slate-50">{formatValue(row.val_y_eod, isPercentMetric)}</td>
                                            <td className={`px-4 py-3 text-right border-r border-slate-100 font-black text-bank-navy text-[16px] bg-blue-50/30 ring-1 ring-inset ring-blue-50/50 ${isRoot ? 'text-[18px] bg-blue-100/20' : ''}`}>
                                                {formatValue(row.val_current, isPercentMetric)}
                                            </td>
                                            <td className="px-4 py-3 text-right border-r border-slate-50">
                                                {!isRate ? <GrowthIndicator val={row.growth_day} isInverse={isInverse} isPercent={isPercentMetric} /> : <span className="text-slate-200">-</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right border-r border-slate-50">
                                                {!isRate ? <GrowthIndicator val={row.growth_month} isInverse={isInverse} isPercent={isPercentMetric} /> : <span className="text-slate-200">-</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right border-r border-slate-50 bg-bank-teal/5">
                                                {!isRate ? <GrowthIndicator val={row.growth_fy} isInverse={isInverse} isPercent={isPercentMetric} /> : <span className="text-slate-200">-</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right border-r border-slate-100 bg-bank-teal/10">
                                                {!isRate ? <GrowthIndicator val={calcPctVar(row.growth_fy, row.val_fy_start)} isInverse={isInverse} isPercent={true} /> : <span className="text-slate-200">-</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-400 border-r border-slate-50">
                                                {!isRate ? formatValue(row.budget_month, isPercentMetric) : <span className="text-slate-200 text-[11px]">N/A</span>}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-bold border-r border-slate-50 ${(isInverse ? row.gap_month <= 0 : row.gap_month >= 0) ? 'text-bank-teal' : 'text-rose-500'}`}>
                                                {!isRate ? formatValue(row.gap_month, isPercentMetric) : <span className="text-slate-200 text-[11px]">-</span>}
                                            </td>
                                            <td className="px-4 py-3 border-r border-slate-100 text-center bg-indigo-50/5">
                                                {!isRate ? (
                                                    <span className={`px-3 py-1 rounded text-[11px] font-black uppercase tracking-tighter ${getStatusStyle(row.status)} shadow-[0_1px_2px_rgba(0,0,0,0.1)] opacity-90`}>
                                                        {row.status}
                                                    </span>
                                                ) : <span className="text-slate-200 text-[11px]">-</span>}
                                            </td>
                                            <th className="px-4 py-3 text-right border-r border-slate-50 text-[10px] uppercase">
                                                {!isRate ? formatValue(row.budget_quarter, isPercentMetric) : <span className="text-slate-200 text-[11px]">N/A</span>}
                                            </th>
                                            <th className={`px-4 py-3 text-right font-bold border-l border-slate-50 ${(isInverse ? row.gap_quarter <= 0 : row.gap_quarter >= 0) ? 'text-bank-teal' : 'text-rose-500'}`}>
                                                {!isRate ? formatValue(row.gap_quarter, isPercentMetric) : <span className="text-slate-200 text-[11px]">-</span>}
                                            </th>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
