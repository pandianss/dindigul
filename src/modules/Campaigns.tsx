import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Target, 
    TrendingUp, 
    TrendingDown, 
    Calendar, 
    ChevronRight, 
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Trophy,
    AlertCircle,
    Upload,
    Users,
    Trash2,
    Edit3
} from 'lucide-react';
import api from '../services/api';
import { format } from 'date-fns';
import CampaignManager from './CampaignManager';
import CampaignDetails from './CampaignDetails';

interface Campaign {
    id: string;
    title: string;
    tagline: string;
    logoUrl: string;
    startDate: string;
    endDate: string;
    type: string;
    metric: string;
    targetValue: number;
    status: string;
    _count: {
        dailyData: number;
        targets: number;
    };
}

const Campaigns: React.FC = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [showManager, setShowManager] = useState(false);
    const [editCampaignId, setEditCampaignId] = useState<string | null>(null);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const res = await api.get('/campaigns');
            setCampaigns(res.data);
        } catch (error) {
            console.error('Failed to fetch campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const handleDeleteCampaign = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this campaign? All performance data will be lost.')) return;
        
        try {
            await api.delete(`/campaigns/${id}`);
            fetchCampaigns();
        } catch (error) {
            console.error('Failed to delete campaign:', error);
            alert('Failed to delete campaign.');
        }
    };

    const handleEditCampaign = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditCampaignId(id);
        setShowManager(true);
    };

    if (selectedCampaignId) {
        return <CampaignDetails id={selectedCampaignId} onBack={() => setSelectedCampaignId(null)} />;
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-bank-navy tracking-tight uppercase">Campaign Management</h2>
                    <p className="text-gray-400 font-medium mt-1">Drive performance through targeted initiatives and real-time tracking.</p>
                </div>
                <button
                    onClick={() => setShowManager(true)}
                    className="bg-bank-navy text-white px-6 py-3 rounded-2xl font-black flex items-center space-x-2 shadow-lg shadow-bank-navy/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    <Plus size={20} />
                    <span>Launch New Campaign</span>
                </button>
            </div>

            {/* Quick Stats / Overview */}
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
                                onClick={() => setShowManager(true)}
                                className="mt-4 text-bank-teal text-xs font-black uppercase hover:underline"
                            >
                                Start your first campaign
                            </button>
                        </div>
                    ) : campaigns.map(campaign => (
                        <div 
                            key={campaign.id}
                            onClick={() => setSelectedCampaignId(campaign.id)}
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
                                    onClick={(e) => handleEditCampaign(campaign.id, e)}
                                    className="p-2 text-gray-400 hover:text-bank-navy hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    <Edit3 size={18} />
                                </button>
                                <button 
                                    onClick={(e) => handleDeleteCampaign(campaign.id, e)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <div className="text-gray-300 group-hover:translate-x-1 group-hover:text-bank-navy transition-all">
                                    <ChevronRight size={24} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {(showManager || editCampaignId) && (
                <CampaignManager 
                    editId={editCampaignId || undefined}
                    onClose={() => {
                        setShowManager(false);
                        setEditCampaignId(null);
                    }} 
                    onSuccess={() => {
                        setShowManager(false);
                        setEditCampaignId(null);
                        fetchCampaigns();
                    }} 
                />
            )}
        </div>
    );
};

export default Campaigns;

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
