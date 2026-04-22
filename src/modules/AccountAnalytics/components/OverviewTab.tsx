import React from 'react';
import { StatsSummary } from './StatsSummary';
import { BranchPerformanceTable } from './BranchPerformanceTable';
import { AnalyticsData, BranchStats } from '../types';

interface OverviewTabProps {
    stats: AnalyticsData | null;
    branchPeriod: 'month' | 'fy';
    setBranchPeriod: (p: 'month' | 'fy') => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    filteredBranches: BranchStats[];
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
    stats,
    branchPeriod,
    setBranchPeriod,
    searchQuery,
    setSearchQuery,
    filteredBranches
}) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <StatsSummary stats={stats} />
            </div>
            <BranchPerformanceTable 
                stats={stats}
                branchPeriod={branchPeriod}
                setBranchPeriod={setBranchPeriod}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filteredBranches={filteredBranches}
            />
        </div>
    );
};
