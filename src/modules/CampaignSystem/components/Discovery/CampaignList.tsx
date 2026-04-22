import React from 'react';
import { Search, Loader2, Target } from 'lucide-react';
import { Campaign } from '../../types';
import { QuickStats } from './QuickStats';
import { CampaignItem } from './CampaignItem';

interface CampaignListProps {
    campaigns: Campaign[];
    loading: boolean;
    onSelect: (id: string) => void;
    onEdit: (id: string, e: React.MouseEvent) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
    onLaunch: () => void;
}

export const CampaignList: React.FC<CampaignListProps> = ({
    campaigns,
    loading,
    onSelect,
    onEdit,
    onDelete,
    onLaunch
}) => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-bank-navy tracking-tight uppercase">Campaign Management</h2>
                    <p className="text-gray-400 font-medium mt-1">Drive performance through targeted initiatives and real-time tracking.</p>
                </div>
                <button
                    onClick={onLaunch}
                    className="bg-bank-navy text-white px-6 py-3 rounded-2xl font-black flex items-center space-x-2 shadow-lg shadow-bank-navy/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    <Target size={20} />
                    <span className="uppercase tracking-widest text-xs">Launch New Campaign</span>
                </button>
            </div>

            <QuickStats campaigns={campaigns} />

            {/* Campaign List */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <div className="flex items-center space-x-4">
                        <h3 className="font-black text-bank-navy uppercase tracking-widest text-xs">All Campaigns</h3>
                        <div className="h-4 w-px bg-gray-200" />
                        <span className="text-[10px] font-bold text-gray-400">{campaigns.length} Total</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search campaigns..."
                                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-bank-navy/5 outline-none w-64"
                            />
                        </div>
                    </div>
                </div>

                <div className="divide-y divide-gray-50">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                            <Loader2 size={32} className="animate-spin mb-4 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest">Retrieving Initiatives...</p>
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                            <Target size={48} className="mb-4 opacity-10" />
                            <p className="text-sm font-bold">No active campaigns found.</p>
                            <button 
                                onClick={onLaunch}
                                className="mt-4 text-bank-teal text-xs font-black uppercase hover:underline"
                            >
                                Start your first campaign
                            </button>
                        </div>
                    ) : campaigns.map(campaign => (
                        <CampaignItem 
                            key={campaign.id}
                            campaign={campaign}
                            onSelect={onSelect}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
