import React, { useState, useEffect, useRef } from 'react';
import { 
    ChevronLeft, 
    Upload, 
    Download, 
    ArrowUpRight, 
    ArrowDownRight, 
    Target, 
    TrendingUp, 
    TrendingDown,
    Filter, 
    Search,
    RefreshCw,
    Trophy,
    Target as TargetIcon,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Table,
    Trash2,
    Verified
} from 'lucide-react';
import api from '../services/api';
import { format, subDays, startOfDay, isSunday, addDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface CampaignDetailsProps {
    id: string;
    onBack: () => void;
}

const CampaignDetails: React.FC<CampaignDetailsProps> = ({ id, onBack }) => {
    const [campaign, setCampaign] = useState<any>(null);
    const [rankings, setRankings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [cRes, rRes] = await Promise.all([
                api.get(`/campaigns/${id}`),
                api.get(`/campaigns/${id}/performance?date=${selectedDate}`)
            ]);
            setCampaign(cRes.data);
            setRankings(rRes.data);
        } catch (error) {
            console.error('Failed to fetch campaign details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEntry = async (entryId: string) => {
        if (!window.confirm('Delete this performance entry?')) return;
        try {
            await api.delete(`/campaigns/${id}/data/${entryId}`);
            fetchData();
        } catch (error) {
            console.error('Failed to delete entry:', error);
            alert('Failed to delete entry.');
        }
    };

    useEffect(() => {
        fetchData();
    }, [id, selectedDate]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n');
            // Expected format: BranchCode,Value
            // Start from line 1 (header is line 0)
            const updates = [];
            for (let i = 1; i < lines.length; i++) {
                const [code, value] = lines[i].split(',');
                if (code && value) {
                    const branch = campaign.targets.find((t: any) => t.branch.code === code.trim())?.branch;
                    if (branch) {
                        updates.push(api.post(`/campaigns/${id}/data`, {
                            branchId: branch.id,
                            date: selectedDate,
                            value: Number(value)
                        }));
                    }
                }
            }

            try {
                await Promise.all(updates);
                fetchData();
                alert(`Successfully processed ${updates.length} records.`);
            } catch (error) {
                console.error('Failed to upload data:', error);
                alert('Failed to process some records.');
            } finally {
                setUploading(false);
            }
        };
        reader.readAsText(file);
    };

    if (loading || !campaign) return (
        <div className="p-20 flex flex-col items-center justify-center text-gray-400 animate-pulse">
            <RefreshCw size={48} className="animate-spin mb-4 opacity-10" />
            <p className="text-sm font-black uppercase tracking-widest">Aggregating Strategic Intelligence...</p>
        </div>
    );

    const totalAchievement = rankings?.overall.reduce((sum: number, r: any) => sum + r.totalAchievement, 0) || 0;
    const totalPercentage = (totalAchievement / campaign.targetValue) * 100;
    
    // Prepare Chart Data
    const chartData = campaign.dailyData.reduce((acc: any[], curr: any) => {
        const dateStr = format(new Date(curr.date), 'dd MMM');
        const existing = acc.find(d => d.date === dateStr);
        if (existing) {
            existing.value += curr.value;
        } else {
            acc.push({ date: dateStr, value: curr.value });
        }
        return acc;
    }, []);

    const dailyTarget = campaign.targetValue / campaign.totalWorkingDays;

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Nav & Title */}
            <div className="flex justify-between items-start">
                <button 
                    onClick={onBack}
                    className="group bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:border-bank-navy/20 transition-all flex items-center space-x-3"
                >
                    <ChevronLeft size={20} className="text-gray-400 group-hover:text-bank-navy transform group-hover:-translate-x-1 duration-300" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-bank-navy">Campaign Explorer</span>
                </button>
                <div className="flex bg-white p-2 rounded-2xl border border-gray-100 shadow-sm space-x-1">
                    <button className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-bank-navy text-white shadow-lg shadow-bank-navy/20">Performance</button>
                    <button className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50">Intelligence</button>
                    <button className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50">Configuration</button>
                </div>
            </div>

            <div className="flex justify-between items-end bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-bank-teal/5 blur-[100px] rounded-full -mr-20 -mt-20" />
                <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-2">
                         <span className="bg-bank-teal/10 text-bank-teal px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{campaign.type.replace('_', ' ')}</span>
                         <span className="text-gray-300">•</span>
                         <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{format(new Date(campaign.startDate), 'dd MMM')} - {format(new Date(campaign.endDate), 'dd MMM yyyy')}</span>
                    </div>
                    <h2 className="text-4xl font-black text-bank-navy tracking-tight uppercase leading-none">{campaign.title}</h2>
                    <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-xs">{campaign.tagline}</p>
                </div>
                <div className="text-right relative z-10 flex flex-col items-end">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Progress</p>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-5xl font-black text-bank-navy">{totalPercentage.toFixed(1)}%</span>
                        <span className="text-xs font-black text-bank-teal uppercase">Achievement</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Chart Segment */}
                <div className="md:col-span-3 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="font-black text-bank-navy text-lg uppercase tracking-tight">Performance Velocity</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-bold">Daily Aggregate Growth</p>
                        </div>
                        <div className="flex items-center space-x-6 text-[10px] font-black uppercase tracking-widest">
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-bank-teal shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
                                <span className="text-bank-navy">Daily Achievement</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300" />
                                <span className="text-gray-400">Target Velocity</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-grow min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}}
                                />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', background: '#fff', padding: '12px' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#2dd4bf" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Daily Update Segment */}
                <div className="bg-bank-navy p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-between">
                    <div>
                        <h3 className="font-black text-xl uppercase tracking-tight mb-1">Daily Pulse</h3>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-6 font-bold">Update Branch Data</p>
                        
                        <div className="space-y-6">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                <label className="text-[10px] font-black text-white/40 uppercase block mb-2 font-bold tracking-widest">Selected Date</label>
                                <div className="flex items-center space-x-3">
                                    <Calendar size={18} className="text-bank-teal" />
                                    <input 
                                        type="date" 
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="bg-transparent text-sm font-black text-white outline-none w-full"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="w-full bg-bank-teal py-4 rounded-2xl font-black text-bank-navy flex items-center justify-center space-x-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-bank-teal/20 disabled:opacity-50"
                            >
                                {uploading ? <RefreshCw size={20} className="animate-spin" /> : <Upload size={20} />}
                                <span className="uppercase text-xs tracking-widest">{uploading ? 'Processing Intelligence...' : 'Upload Daily CSV'}</span>
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />

                            <div className="text-center">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest leading-relaxed">
                                    Required CSV Format:<br/>
                                    <span className="text-white/60">BranchCode, Value (NPA/Accounts)</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/10 mt-6">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 font-bold">
                            <span>Daily Velocity</span>
                            <span className="text-bank-teal">{totalAchievement.toLocaleString()} Total</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-bank-teal shadow-[0_0_8px_rgba(45,212,191,0.5)] transition-all duration-1000" style={{ width: `${totalPercentage}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Manual Entries History */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 bg-gray-50/10 flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-bank-navy text-lg uppercase tracking-tight">Data Entry History</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-bold">Manage individual performance records</p>
                    </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    <table className="w-full">
                        <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
                            <tr>
                                <th className="py-4 px-8 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Branch</th>
                                <th className="py-4 px-8 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                <th className="py-4 px-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Metric Value</th>
                                <th className="py-4 px-8 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {campaign.dailyData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-gray-400 font-bold italic text-sm">No entries recorded for this campaign yet.</td>
                                </tr>
                            ) : campaign.dailyData.map((entry: any) => (
                                <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="py-4 px-8">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-[10px] font-black text-bank-navy bg-gray-100 px-2 py-1 rounded-md">{entry.branch.code}</span>
                                            <span className="font-bold text-bank-navy text-sm uppercase">{entry.branch.nameEn}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-8">
                                        <span className="text-sm font-bold text-gray-500">{format(new Date(entry.date), 'dd MMM yyyy')}</span>
                                    </td>
                                    <td className="py-4 px-8 text-center text-sm font-black text-bank-teal">
                                        {entry.value.toLocaleString()}
                                    </td>
                                    <td className="py-4 px-8 text-right">
                                        <button 
                                            onClick={() => handleDeleteEntry(entry.id)}
                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            )).reverse()}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Performance Ranking Table */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden mb-8">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="w-14 h-14 bg-bank-gold/10 rounded-2xl flex items-center justify-center text-bank-gold">
                        <Trophy size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Qualification Deadline</p>
                        <h3 className="text-lg font-black text-bank-navy">
                            {rankings?.qualificationDate ? format(new Date(rankings.qualificationDate), 'dd MMM yyyy') : 'Calculating...'}
                        </h3>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">80% Duration Mark</p>
                    </div>
                </div>
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                    <div className="flex items-center space-x-4">
                        <Trophy size={20} className="text-bank-gold" />
                        <h3 className="font-black text-bank-navy text-lg uppercase tracking-tight">Regional Leaderboard</h3>
                        <div className="h-4 w-px bg-gray-200" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">Status as of {format(new Date(selectedDate), 'dd MMMM')}</span>
                    </div>
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                            <CheckCircle2 size={16} className="text-green-500" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active</span>
                        </div>
                        <div className="flex items-center space-x-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-bank-gold shadow-[0_0_8px_rgba(212,175,55,1)]" />
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prime Focus</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="py-4 px-8 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Rank</th>
                                <th className="py-4 px-8 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Branch Profile</th>
                                <th className="py-4 px-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Daily Progress</th>
                                <th className="py-4 px-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Aggregated (Total)</th>
                                <th className="py-4 px-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Objective</th>
                                <th className="py-4 px-8 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Factor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 overflow-hidden">
                            {rankings?.overall.map((r: any, index: number) => (
                                <tr key={r.branchId} className="group hover:bg-gray-50/50 transition-all">
                                    <td className="py-5 px-8">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-[10px] font-black text-bank-navy group-hover:bg-bank-teal group-hover:text-white transition-all shadow-sm">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <p className="font-black text-bank-navy text-sm uppercase tracking-tight">{r.branchName}</p>
                                                    {r.isQualified && (
                                                        <div className="flex items-center bg-bank-teal/10 text-bank-teal px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest animate-in zoom-in-50">
                                                            <Verified size={10} className="mr-1" />
                                                            Qualified
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase">BRANCH {r.branchCode}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <span className="font-black text-bank-teal">{r.dailyAchievement}</span>
                                            {r.dailyAchievement > dailyTarget ? <ArrowUpRight size={14} className="text-bank-teal" /> : <TrendingDown size={14} className="text-gray-300" />}
                                        </div>
                                    </td>
                                    <td className="py-5 px-8 text-center">
                                        <span className="font-black text-bank-navy">{r.totalAchievement}</span>
                                    </td>
                                    <td className="py-5 px-8 text-center">
                                        <span className="font-black text-gray-400 opacity-50">{r.target}</span>
                                    </td>
                                    <td className="py-5 px-8 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-sm font-black ${r.percentage >= 100 ? 'text-bank-teal' : r.percentage >= 50 ? 'text-bank-navy' : 'text-gray-400'}`}>
                                                {r.percentage.toFixed(1)}%
                                            </span>
                                            <div className="w-24 h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-1000 ${r.percentage >= 100 ? 'bg-bank-teal' : 'bg-bank-navy'}`}
                                                    style={{ width: `${Math.min(r.percentage, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CampaignDetails;
