import React, { useState, useEffect, useRef } from 'react';
import { format, subDays, startOfDay, isSunday, addDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import api from '../services/api';
import {
    Plus, Target, TrendingUp, TrendingDown, Calendar, ChevronRight, Search, 
    Filter, ArrowUpRight, ArrowDownRight, Loader2, Trophy, AlertCircle, 
    Upload, Users, Trash2, Edit3, X, Globe, Save, RefreshCw, ChevronLeft, Check, User
} from 'lucide-react';


// ==================== CampaignManager.tsx ====================
interface Branch {
    id: string;
    nameEn: string;
    code: string;
    type: string;
}


interface CampaignManagerProps {
    editId?: string;
    onClose: () => void;
    onSuccess: () => void;
}

const CampaignManager: React.FC<CampaignManagerProps> = ({ editId, onClose, onSuccess }) => {
    const [step, setStep] = useState<number>(1);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        tagline: '',
        logoUrl: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        type: 'INCREASE_COUNT',
        metric: 'Accounts',
        targetValue: 0
    });

    const [branchTargets, setBranchTargets] = useState<Record<string, number>>({});
    const [typeWeights, setTypeWeights] = useState<Record<string, number>>({});


    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                const branchRes = await api.get('/branches');
                setBranches(branchRes.data);

                if (editId) {
                    const campaignRes = await api.get(`/campaigns/${editId}`);
                    const c = campaignRes.data;
                    setFormData({
                        title: c.title,
                        tagline: c.tagline || '',
                        logoUrl: c.logoUrl || '',
                        startDate: format(new Date(c.startDate), 'yyyy-MM-dd'),
                        endDate: format(new Date(c.endDate), 'yyyy-MM-dd'),
                        type: c.type,
                        metric: c.metric,
                        targetValue: c.targetValue
                    });

                    const targets: Record<string, number> = {};
                    c.targets.forEach((t: any) => {
                        targets[t.branchId] = t.targetValue;
                    });
                    setBranchTargets(targets);
                }
            } catch (err) {
                console.error('Failed to load metadata:', err);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [editId]);

    const handleDistributeEqually = () => {
        const perBranch = Math.floor(formData.targetValue / branches.length);
        const newTargets: Record<string, number> = {};
        branches.forEach(b => {
            newTargets[b.id] = perBranch;
        });
        setBranchTargets(newTargets);
    };

    const handleDistributeByWeight = () => {
        if (formData.targetValue <= 0) return;

        // Calculate total weight across all branches based on their type
        const branchWeights = branches.map(b => ({
            id: b.id,
            weight: typeWeights[b.type] || 1
        }));
        const totalWeight = branchWeights.reduce((sum, bw) => sum + bw.weight, 0);

        if (totalWeight <= 0) return;

        const newTargets: Record<string, number> = {};
        let allocatedSoFar = 0;

        branchWeights.forEach((bw, index) => {
            // Allocate proportionally
            let share = Math.floor((bw.weight / totalWeight) * formData.targetValue);
            
            // Adjust the last branch to ensure total matches exactly
            if (index === branchWeights.length - 1) {
                share = formData.targetValue - allocatedSoFar;
            }
            
            newTargets[bw.id] = share;
            allocatedSoFar += share;
        });

        setBranchTargets(newTargets);
    };


    const handleSubmit = async () => {
        if (!formData.title || formData.targetValue <= 0) {
            alert('Please provide a title and a valid target value.');
            return;
        }

        setSubmitting(true);
        try {
            const targets = Object.entries(branchTargets).map(([branchId, targetValue]) => ({
                branchId,
                targetValue
            }));

            if (editId) {
                await api.patch(`/campaigns/${editId}`, {
                    ...formData,
                    startDate: new Date(formData.startDate),
                    endDate: new Date(formData.endDate),
                    targets
                });
            } else {
                await api.post('/campaigns', {
                    ...formData,
                    startDate: new Date(formData.startDate),
                    endDate: new Date(formData.endDate),
                    targets
                });
            }
            onSuccess();
        } catch (error) {
            console.error('Failed to launch campaign:', error);
            alert('Failed to launch campaign.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-bank-navy/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#F8FAFC] rounded-[2.5rem] shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden border border-white/20">
                {/* Header */}
                <div className="bg-bank-navy p-6 pb-20 text-white flex justify-between items-center shrink-0 relative">
                    <div className="flex items-center space-x-4">
                        <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                            <Target size={24} className="text-bank-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight uppercase">{editId ? 'Modify Strategic Campaign' : 'Launch Strategic Campaign'}</h2>
                            <p className="text-xs text-white/40 font-bold tracking-widest uppercase mt-0.5">Define metrics and set performance targets</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all text-white/60 hover:text-white">
                        <X size={24} />
                    </button>

                    {/* Step Indicator */}
                    <div className="absolute -bottom-6 left-6 right-6 flex items-center bg-white p-4 rounded-2xl shadow-xl border border-gray-100">
                        <div className="flex-1 flex items-center space-x-4 px-4">
                            {[1, 2, 3].map(s => (
                                <React.Fragment key={s}>
                                    <div className={`flex items-center space-x-2 ${step >= s ? 'text-bank-navy' : 'text-gray-300'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${step === s ? 'bg-bank-navy text-white shadow-lg' : step > s ? 'bg-bank-teal text-white' : 'bg-gray-100'}`}>
                                            {s === 1 ? '01' : s === 2 ? '02' : '03'}
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {s === 1 ? 'Initiative Details' : s === 2 ? 'Target Distribution' : 'Action Review'}
                                        </span>
                                    </div>
                                    {s < 3 && <div className={`flex-grow h-px ${step > s ? 'bg-bank-teal' : 'bg-gray-200'}`} />}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-grow overflow-hidden flex flex-col pt-12 p-8">
                    {step === 1 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-6">
                                        <div className="w-24 h-24 bg-white border-2 border-gray-100 rounded-[2rem] flex items-center justify-center overflow-hidden shadow-sm shrink-0 border-dashed hover:border-bank-navy transition-all group">
                                            {formData.logoUrl ? (
                                                <img src={formData.logoUrl} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <Target size={32} className="text-gray-200 group-hover:text-bank-navy transition-colors scale-x-[-1]" />
                                            )}
                                        </div>
                                        <div className="flex-grow">
                                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest leading-none">Initiative Identity (Logo URL)</label>
                                            <input
                                                type="text"
                                                placeholder="Link to campaign logo..."
                                                value={formData.logoUrl}
                                                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                                                className="w-full bg-transparent border-b-2 border-gray-100 py-3 text-xs font-bold text-bank-navy focus:border-bank-navy outline-none transition-all placeholder:text-gray-200"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-gray-50">
                                        <div className="group">
                                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Campaign Title</label>
                                            <input
                                                type="text"
                                                placeholder="e.g., CASA Surge Q1"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 px-6 text-lg font-black text-bank-navy focus:border-bank-navy outline-none transition-all placeholder:text-gray-200"
                                            />
                                        </div>
                                        <div className="group">
                                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Strategic Tagline</label>
                                            <input
                                                type="text"
                                                placeholder="Drive excellence through growth..."
                                                value={formData.tagline}
                                                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                                className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3 px-6 text-sm font-bold text-gray-700 focus:border-bank-navy outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="group">
                                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Global Metric</label>
                                            <select
                                                value={formData.metric}
                                                onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
                                                className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3 px-6 text-sm font-black text-bank-navy outline-none"
                                            >
                                                <option value="Accounts">Accounts (Count)</option>
                                                <option value="Amount (Cr)">Amount (Cr)</option>
                                                <option value="NPA Progress">NPA Progress</option>
                                                <option value="CASA %">CASA %</option>
                                            </select>
                                        </div>
                                        <div className="group">
                                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Campaign Type</label>
                                            <select
                                                value={formData.type}
                                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                                className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3 px-6 text-sm font-black text-bank-navy outline-none"
                                            >
                                                <option value="INCREASE_COUNT">Bulk New Accounts</option>
                                                <option value="INCREASE_AMOUNT">Volume Increase</option>
                                                <option value="DECREASE_OUTSTANDING">Reduction Drive</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Total Regional Target</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={formData.targetValue}
                                                onChange={(e) => setFormData({ ...formData, targetValue: Number(e.target.value) })}
                                                className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 px-6 text-2xl font-black text-bank-teal outline-none"
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300 uppercase tracking-widest">{formData.metric}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-8 pt-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase block tracking-widest">Timeline Alignment</label>
                                    <div className="flex items-center space-x-4">
                                        <div className="flex-1 bg-white p-4 rounded-2xl border-2 border-gray-100 flex items-center space-x-3">
                                            <Calendar size={18} className="text-gray-300" />
                                            <input 
                                                type="date" 
                                                value={formData.startDate}
                                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                                className="bg-transparent text-sm font-black text-bank-navy outline-none"
                                            />
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300" />
                                        <div className="flex-1 bg-white p-4 rounded-2xl border-2 border-gray-100 flex items-center space-x-3">
                                            <Calendar size={18} className="text-gray-300" />
                                            <input 
                                                type="date" 
                                                value={formData.endDate}
                                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                className="bg-transparent text-sm font-black text-bank-navy outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-bank-teal/5 p-6 rounded-[2rem] border border-bank-teal/10 flex items-center space-x-6">
                                    <div className="flex-shrink-0 w-12 h-12 bg-bank-teal text-white rounded-2xl flex items-center justify-center">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-bank-teal uppercase tracking-widest">Target Scope</p>
                                        <p className="text-sm font-bold text-bank-navy mt-1">This campaign will be active across <span className="font-black text-bank-teal">{branches.length} branches</span>.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex-grow flex flex-col space-y-6 animate-in slide-in-from-right-4 duration-300 overflow-hidden">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h3 className="font-black text-bank-navy text-xl uppercase tracking-tight">Allocate Goals</h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Assign targets to individual branches</p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="text-right mr-4">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Assigned</p>
                                        <p className={`text-lg font-black ${Object.values(branchTargets).reduce((a, b) => a + b, 0) === formData.targetValue ? 'text-bank-teal' : 'text-orange-500'}`}>
                                            {Object.values(branchTargets).reduce((a, b) => a + b, 0)} / {formData.targetValue}
                                        </p>
                                    </div>
                                    <div className="flex bg-gray-100 p-1 rounded-xl">
                                        <button 
                                            onClick={handleDistributeEqually}
                                            className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white hover:shadow-sm transition-all text-bank-navy"
                                        >
                                            Equal
                                        </button>
                                        <button 
                                            onClick={handleDistributeByWeight}
                                            className="bg-bank-navy text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-bank-navy/10 hover:scale-[1.02] transition-all"
                                        >
                                            By Weight
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Weight Configuration */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Branch Type Weights (Urban, Rural, etc.)</p>
                                    <div className="h-px flex-grow mx-4 bg-gray-50" />
                                </div>
                                <div className="flex flex-wrap gap-6">
                                    {[...new Set(branches.map(b => b.type))].sort().map(type => (
                                        <div key={type} className="flex items-center space-x-3">
                                            <span className="text-[10px] font-black text-bank-navy uppercase whitespace-nowrap">{type.replace(/_/g, ' ')}</span>
                                            <input 
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={typeWeights[type] ?? 1}
                                                onChange={(e) => setTypeWeights({ ...typeWeights, [type]: parseFloat(e.target.value) || 0 })}
                                                className="w-16 bg-gray-50 border border-gray-100 rounded-lg py-1 px-3 text-center font-black text-bank-teal text-xs outline-none focus:bg-white focus:border-bank-teal transition-all"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>


                            <div className="flex-grow overflow-y-auto pr-4 space-y-3 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-4">
                                    {branches.map(b => (
                                        <div key={b.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-bank-teal/30 hover:shadow-md transition-all">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-[10px] font-black text-bank-navy group-hover:bg-bank-teal group-hover:text-white transition-colors">
                                                    {b.code}
                                                </div>
                                                <div>
                                                    <p className="font-black text-bank-navy text-sm uppercase leading-none mb-1">{b.nameEn}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 tracking-widest">{b.type.replace(/_/g, ' ')} BRANCH</p>
                                                </div>

                                            </div>
                                            <div className="relative">
                                                <input 
                                                    type="number"
                                                    value={branchTargets[b.id] || 0}
                                                    onChange={(e) => setBranchTargets({ ...branchTargets, [b.id]: Number(e.target.value) })}
                                                    className="w-32 bg-gray-50 border border-gray-100 rounded-xl py-2 px-4 text-right font-black text-bank-navy focus:bg-white focus:border-bank-teal outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex-grow flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-500">
                            <div className="relative">
                                <div className="absolute inset-0 bg-bank-teal/20 blur-[60px] rounded-full" />
                                <div className="relative w-32 h-32 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center text-bank-teal border-4 border-bank-teal/10">
                                    <Check size={64} className="animate-in zoom-in-50 duration-500" />
                                </div>
                            </div>
                            <div className="max-w-md">
                                <h3 className="text-3xl font-black text-bank-navy tracking-tight uppercase mb-2">Initialize Campaign</h3>
                                <p className="text-gray-500 font-bold leading-relaxed tracking-tight">
                                    You are about to launch <span className="text-bank-teal underline decoration-2">{formData.title}</span> across {branches.length} branches with a total regional target of <span className="font-black text-bank-navy">{formData.targetValue.toLocaleString()} {formData.metric}</span>.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-left">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 font-bold">Timeline</p>
                                    <p className="text-sm font-black text-bank-navy">
                                        Starts: {format(new Date(formData.startDate), 'dd MMMM')}<br/>
                                        Ends: {format(new Date(formData.endDate), 'dd MMMM yyyy')}
                                    </p>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-left">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 font-bold">Distribution</p>
                                    <p className="text-sm font-black text-bank-navy">
                                        Assigned to {Object.keys(branchTargets).length} Branches<br/>
                                        Metric: {formData.metric}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 bg-white border-t border-gray-100 flex justify-between items-center shrink-0">
                    <button
                        onClick={() => step > 1 ? setStep(step - 1) : onClose()}
                        className="px-8 py-3.5 text-gray-400 font-black uppercase text-xs tracking-widest hover:bg-gray-50 rounded-2xl transition-all flex items-center space-x-2"
                    >
                        <ChevronLeft size={16} />
                        <span>{step === 1 ? 'Discard Initialization' : 'Previous Phase'}</span>
                    </button>

                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => step < 3 ? setStep(step + 1) : handleSubmit()}
                            disabled={submitting}
                            className="bg-bank-navy text-white px-10 py-3.5 rounded-2xl font-black flex items-center space-x-2 shadow-xl shadow-bank-navy/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {submitting ? (
                                <RefreshCw size={20} className="animate-spin" />
                            ) : step === 3 ? (
                                <Save size={20} />
                            ) : (
                                <ChevronRight size={20} />
                            )}
                            <span className="uppercase tracking-widest text-xs">
                                {submitting ? 'Broadcasting...' : step === 3 ? (editId ? 'Update & Save' : 'Confirm & Launch') : 'Proceed to Next Step'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==================== CampaignDetails.tsx ====================
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

// ==================== Campaigns.tsx ====================
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
