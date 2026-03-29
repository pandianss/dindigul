import React, { useState, useEffect } from 'react';
import { X, Target, Calendar, Globe, Save, RefreshCw, ChevronLeft, ChevronRight, Upload, Check, User, Users } from 'lucide-react';
import api from '../services/api';
import { format, addDays } from 'date-fns';

interface Branch {
    id: string;
    nameEn: string;
    code: string;
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
                                    <button 
                                        onClick={handleDistributeEqually}
                                        className="bg-bank-navy text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-bank-navy/10 hover:scale-[1.02] transition-all"
                                    >
                                        Distribute Equally
                                    </button>
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
                                                    <p className="text-[10px] font-bold text-gray-400 tracking-widest">BRANCH ENTITY</p>
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

export default CampaignManager;
