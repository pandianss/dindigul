import React from 'react';
import { Target, Trophy, AlertCircle } from 'lucide-react';
import { Campaign } from '../../types';

interface QuickStatsProps {
    campaigns: Campaign[];
}

export const QuickStats: React.FC<QuickStatsProps> = ({ campaigns }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-4">
                <div className="w-14 h-14 bg-bank-teal/10 rounded-2xl flex items-center justify-center text-bank-teal">
                    <Target size={28} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Campaigns</p>
                    <h3 className="text-2xl font-black text-bank-navy">{campaigns.filter(c => c.status === 'ACTIVE').length}</h3>
                </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-4">
                <div className="w-14 h-14 bg-bank-gold/10 rounded-2xl flex items-center justify-center text-bank-gold">
                    <Trophy size={28} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Top Performers Today</p>
                    <h3 className="text-2xl font-black text-bank-navy">3 Branches</h3>
                </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-4">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
                    <AlertCircle size={28} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Critical Gaps</p>
                    <h3 className="text-2xl font-black text-bank-navy">5 Branches</h3>
                </div>
            </div>
        </div>
    );
};
