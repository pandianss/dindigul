import React from 'react';
import { Target, Calendar, Users, Edit3, Trash2, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Campaign } from '../../types';
import { cn } from '../../utils';

interface CampaignItemProps {
    campaign: Campaign;
    onSelect: (id: string) => void;
    onEdit: (id: string, e: React.MouseEvent) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
}

export const CampaignItem: React.FC<CampaignItemProps> = ({
    campaign,
    onSelect,
    onEdit,
    onDelete
}) => {
    return (
        <div 
            onClick={() => onSelect(campaign.id)}
            className="p-6 hover:bg-gray-50 transition-all cursor-pointer group flex items-center"
        >
            <div className="w-16 h-16 rounded-2xl bg-white flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-gray-100 group-hover:border-bank-navy group-hover:shadow-lg transition-all shadow-sm">
                {campaign.logoUrl ? (
                    <img src={campaign.logoUrl} alt={campaign.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="bg-bank-teal/5 w-full h-full flex items-center justify-center">
                        <Target size={28} className="text-bank-teal opacity-40 group-hover:opacity-100 transition-opacity scale-x-[-1]" />
                    </div>
                )}
            </div>
            <div className="ml-6 flex-grow min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-lg font-black text-bank-navy truncate group-hover:text-bank-teal transition-colors uppercase tracking-tight">{campaign.title}</h4>
                    <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                        campaign.status === 'ACTIVE' ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                    )}>
                        {campaign.status}
                    </span>
                </div>
                <p className="text-xs text-gray-500 font-medium truncate">{campaign.tagline || 'Drive excellence through performance tracking.'}</p>
                <div className="flex items-center mt-3 space-x-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <div className="flex items-center space-x-1.5">
                        <Calendar size={12} />
                        <span>{format(new Date(campaign.startDate), 'dd MMM')} - {format(new Date(campaign.endDate), 'dd MMM yyyy')}</span>
                    </div>
                    <div className="h-1 w-1 rounded-full bg-gray-300" />
                    <div className="flex items-center space-x-1.5">
                        <Users size={12} />
                        <span>{campaign._count.targets} Branches Participating</span>
                    </div>
                </div>
            </div>
            <div className="text-right ml-6 flex-shrink-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Regional Target</p>
                <p className="text-xl font-black text-bank-navy">{campaign.targetValue.toLocaleString()} {campaign.metric}</p>
            </div>
            <div className="ml-8 flex items-center space-x-2">
                <button 
                    onClick={(e) => onEdit(campaign.id, e)}
                    className="p-2 text-gray-400 hover:text-bank-navy hover:bg-gray-100 rounded-xl transition-all"
                >
                    <Edit3 size={18} />
                </button>
                <button 
                    onClick={(e) => onDelete(campaign.id, e)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                    <Trash2 size={18} />
                </button>
                <div className="text-gray-300 group-hover:translate-x-1 group-hover:text-bank-navy transition-all">
                    <ChevronRight size={24} />
                </div>
            </div>
        </div>
    );
};
