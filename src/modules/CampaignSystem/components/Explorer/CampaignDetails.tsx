import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import api from '../../../../services/api';
import { Campaign, PerformanceReport } from '../../types';
import { prepareChartData } from '../../utils';

// Local Components
import { PerformanceVelocity } from './PerformanceVelocity';
import { DailyPulse } from './DailyPulse';
import { DataHistory } from './DataHistory';
import { Leaderboard } from './Leaderboard';

interface CampaignDetailsProps {
    id: string;
    onBack: () => void;
}

export const CampaignDetails: React.FC<CampaignDetailsProps> = ({ id, onBack }) => {
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [rankings, setRankings] = useState<PerformanceReport | null>(null);
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
        if (!file || !campaign) return;

        setUploading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n');
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
                if (fileInputRef.current) fileInputRef.current.value = '';
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
    const chartData = prepareChartData(campaign.dailyData);
    const dailyTarget = campaign.targetValue / (campaign.totalWorkingDays || 30);

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
                <PerformanceVelocity chartData={chartData} />
                <DailyPulse 
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    uploading={uploading}
                    handleFileUpload={handleFileUpload}
                    fileInputRef={fileInputRef}
                    totalAchievement={totalAchievement}
                    totalPercentage={totalPercentage}
                />
            </div>

            <DataHistory dailyData={campaign.dailyData} onDelete={handleDeleteEntry} />
            <Leaderboard 
                rankings={rankings} 
                selectedDate={selectedDate} 
                dailyTarget={dailyTarget} 
            />
        </div>
    );
};
