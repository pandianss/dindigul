import React, { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { Target, X, ChevronLeft, ChevronRight, Save, RefreshCw } from 'lucide-react';
import api from '../../../../services/api';
import { Branch } from '../../types';
import { calculateDistributionWeight } from '../../utils';

// Steps
import { Step1Details } from './Step1Details';
import { Step2Distribution } from './Step2Distribution';
import { Step3Review } from './Step3Review';

interface CampaignManagerProps {
    editId?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const CampaignManager: React.FC<CampaignManagerProps> = ({ editId, onClose, onSuccess }) => {
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
        if (formData.targetValue <= 0) return;
        const perBranch = Math.floor(formData.targetValue / branches.length);
        const newTargets: Record<string, number> = {};
        branches.forEach(b => {
            newTargets[b.id] = perBranch;
        });
        setBranchTargets(newTargets);
    };

    const handleDistributeByWeight = () => {
        const newTargets = calculateDistributionWeight(formData.targetValue, branches, typeWeights);
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
                        <Step1Details formData={formData} setFormData={setFormData} />
                    )}

                    {step === 2 && (
                        <Step2Distribution 
                            branches={branches}
                            formData={formData}
                            branchTargets={branchTargets}
                            setBranchTargets={setBranchTargets}
                            typeWeights={typeWeights}
                            setTypeWeights={setTypeWeights}
                            handleDistributeEqually={handleDistributeEqually}
                            handleDistributeByWeight={handleDistributeByWeight}
                        />
                    )}

                    {step === 3 && <Step3Review formData={formData} branches={branches} branchTargets={branchTargets} />}
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
