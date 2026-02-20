import React, { useState, useEffect } from 'react';
import {
    Scale,
    Calendar,
    Building2,
    User,
    Search,
    Plus,
    Clock,
    AlertCircle,
    TrendingUp,
    Target,
    FileText,
    ArrowUpRight,
    Save
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';

interface LegalCase {
    id: string;
    caseNo: string;
    courtName: string;
    parties: string;
    nextHearingDate?: string;
    advocateName?: string;
    status: string;
    category: string;
    hearingHistory?: string;
}

interface RecoveryAction {
    id: string;
    accountName: string;
    amountInvolved: number;
    type: string;
    status: string;
    branch: { nameEn: string };
    remarks?: string;
}

const LegalManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'LEGAL' | 'RECOVERY'>('LEGAL');
    const [cases, setCases] = useState<LegalCase[]>([]);
    const [recovery, setRecovery] = useState<RecoveryAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);

    // Form states
    const [caseForm, setCaseForm] = useState({
        caseNo: '',
        courtName: '',
        parties: '',
        nextHearingDate: format(new Date(), 'yyyy-MM-dd'),
        advocateName: '',
        status: 'PENDING',
        category: 'CIVIL',
        hearingHistory: ''
    });

    const [recoveryForm, setRecoveryForm] = useState({
        accountName: '',
        amountInvolved: 0,
        type: 'SARFAESI',
        status: 'NOTIFIED',
        branchId: '',
        remarks: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [casesRes, recoveryRes, branchesRes] = await Promise.all([
                api.get('/legal/cases'),
                api.get('/legal/recovery'),
                api.get('/branches')
            ]);
            setCases(casesRes.data);
            setRecovery(recoveryRes.data);
            setBranches(branchesRes.data);
        } catch (error) {
            console.error('Error fetching legal data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveCase = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/legal/cases', caseForm);
            if (response.status === 200) {
                setShowForm(false);
                fetchData();
            }
        } catch (error) {
            console.error('Error saving legal case:', error);
        }
    };

    const handleSaveRecovery = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/legal/recovery', recoveryForm);
            if (response.status === 200) {
                setShowForm(false);
                fetchData();
            }
        } catch (error) {
            console.error('Error saving recovery action:', error);
        }
    };

    const totalRecoveryAmount = recovery.reduce((acc, r) => acc + r.amountInvolved, 0);
    const settledAmount = recovery.filter(r => r.status === 'SETTLED').reduce((acc, r) => acc + r.amountInvolved, 0);

    return (
        <div className="space-y-6 pt-6 h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy font-bank-noto">Legal & Recovery Tracking</h2>
                    <p className="text-gray-500 text-sm">RO Court Case Diary & Recovery Monitor (SARFAESI/OTS)</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('LEGAL')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-all ${activeTab === 'LEGAL' ? 'bg-white text-bank-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Scale size={16} /> <span>Legal Diary</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('RECOVERY')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-all ${activeTab === 'RECOVERY' ? 'bg-white text-bank-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <TrendingUp size={16} /> <span>Recovery</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 shrink-0">
                <div className="card p-5 border-l-4 border-l-bank-navy">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-bank-navy/5 text-bank-navy rounded-lg">
                            <Scale size={20} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-bank-navy">{cases.length}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Court Cases</p>
                </div>
                <div className="card p-5 border-l-4 border-l-amber-500">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-amber-500/5 text-amber-500 rounded-lg">
                            <Calendar size={20} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-bank-navy">
                        {cases.filter(c => c.nextHearingDate && new Date(c.nextHearingDate) > new Date()).length}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pending Hearings</p>
                </div>
                <div className="card p-5 border-l-4 border-l-bank-teal">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-bank-teal/5 text-bank-teal rounded-lg">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-bank-navy">₹{(totalRecoveryAmount / 100000).toFixed(2)}L</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Under Recovery</p>
                </div>
                <div className="card p-5 border-l-4 border-l-bank-gold">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-bank-gold/5 text-bank-gold rounded-lg">
                            <Target size={20} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-bank-navy">₹{(settledAmount / 100000).toFixed(2)}L</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">OTS Settlements</p>
                </div>
            </div>

            <div className="flex-1 flex space-x-6 min-h-0">
                <div className="flex-1 flex flex-col space-y-4">
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm shrink-0">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text" placeholder={`Search ${activeTab === 'LEGAL' ? 'cases, courts, lawyers...' : 'accounts, types, branches...'}`}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-bank-teal/20 rounded-lg text-sm transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setShowForm(true)}
                            className="btn-primary flex items-center space-x-2 bg-bank-navy text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-all text-sm shadow-lg shadow-bank-navy/10"
                        >
                            <Plus size={18} />
                            <span>New {activeTab === 'LEGAL' ? 'Case' : 'Recovery Action'}</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1">
                        {loading ? (
                            <div className="space-y-4 opacity-50">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse"></div>)}
                            </div>
                        ) : activeTab === 'LEGAL' ? (
                            <div className="space-y-3">
                                {cases.map(courtCase => (
                                    <div key={courtCase.id} className="card p-4 hover:shadow-md transition-all flex items-center justify-between group border-l-4 border-l-bank-navy">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-1">
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${courtCase.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{courtCase.status}</span>
                                                <h4 className="font-bold text-bank-navy group-hover:text-bank-teal transition-colors">{courtCase.parties}</h4>
                                                <span className="text-[10px] text-gray-400 font-mono">{courtCase.caseNo}</span>
                                            </div>
                                            <div className="flex items-center space-x-6 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                <span className="flex items-center space-x-1"><Building2 size={12} /> <span>{courtCase.courtName}</span></span>
                                                <span className="flex items-center space-x-1"><User size={12} /> <span>{courtCase.advocateName || 'In-house Counsel'}</span></span>
                                                <span className="flex items-center space-x-1"><FileText size={12} /> <span>{courtCase.category} Case</span></span>
                                            </div>
                                        </div>
                                        {courtCase.nextHearingDate && (
                                            <div className="text-right ml-4">
                                                <div className="flex items-center justify-end space-x-1 text-bank-gold mb-0.5">
                                                    <Clock size={12} />
                                                    <span className="text-xs font-black">Next Hearing</span>
                                                </div>
                                                <p className="text-sm font-bold text-bank-navy">{format(new Date(courtCase.nextHearingDate), 'dd MMM yyyy')}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {recovery.map(item => (
                                    <div key={item.id} className="card p-5 hover:shadow-md transition-all border-l-4 border-l-bank-teal group">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h4 className="font-bold text-bank-navy group-hover:text-bank-teal transition-colors leading-tight">{item.accountName}</h4>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{item.branch?.nameEn || 'Branch Office'}</p>
                                            </div>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${item.status === 'SETTLED' ? 'bg-green-100 text-green-700' : 'bg-indigo-50 text-indigo-700'}`}>{item.status}</span>
                                        </div>
                                        <div className="flex items-end justify-between">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type: {item.type}</p>
                                                <div className="flex items-center space-x-2 text-bank-navy/60">
                                                    <AlertCircle size={14} />
                                                    <span className="text-xs italic truncate max-w-[150px]">{item.remarks || 'No remarks recorded'}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-bank-navy">₹{item.amountInvolved.toLocaleString()}</p>
                                                <ArrowUpRight size={14} className="text-bank-navy ml-auto" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300 border-l border-gray-100 flex flex-col overflow-hidden">
                    <div className="p-6 bg-bank-navy text-white flex items-center justify-between shrink-0">
                        <div>
                            <h3 className="text-xl font-bold">New {activeTab === 'LEGAL' ? 'Legal Entry' : 'Recovery Action'}</h3>
                            <p className="text-blue-200 text-xs">Record relevant details for Regional Monitoring</p>
                        </div>
                        <button onClick={() => setShowForm(false)} className="text-blue-200 hover:text-white text-2xl">✕</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'LEGAL' ? (
                            <form onSubmit={handleSaveCase} className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Case Number</label>
                                        <input
                                            type="text" required placeholder="WP/1234/2026"
                                            className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                            onChange={e => setCaseForm({ ...caseForm, caseNo: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Category</label>
                                        <select
                                            className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                            onChange={e => setCaseForm({ ...caseForm, category: e.target.value })}
                                        >
                                            <option value="CIVIL">Civil Suit</option>
                                            <option value="CRIMINAL">Criminal Case</option>
                                            <option value="CONSUMER">Consumer Court</option>
                                            <option value="LABOUR">Labour Dispute</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Parties Involved</label>
                                    <input
                                        type="text" required placeholder="Bank vs. Parties..."
                                        className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                        onChange={e => setCaseForm({ ...caseForm, parties: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Court Name / Venue</label>
                                    <input
                                        type="text" required placeholder="District Court, Dindigul..."
                                        className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                        onChange={e => setCaseForm({ ...caseForm, courtName: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Advocate Name</label>
                                        <input
                                            type="text" placeholder="Counsel Details"
                                            className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                            onChange={e => setCaseForm({ ...caseForm, advocateName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Next Hearing Date</label>
                                        <input
                                            type="date"
                                            className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                            value={caseForm.nextHearingDate}
                                            onChange={e => setCaseForm({ ...caseForm, nextHearingDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-bank-navy text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center space-x-2 mt-4 hover:scale-[1.02] transition-all">
                                    <Save size={18} /> <span>Submit to Legal Diary</span>
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleSaveRecovery} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Accountholder Name</label>
                                    <input
                                        type="text" required placeholder="Borrower Name..."
                                        className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                        onChange={e => setRecoveryForm({ ...recoveryForm, accountName: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Amount involved (₹)</label>
                                        <input
                                            type="number" required
                                            className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm font-bold"
                                            onChange={e => setRecoveryForm({ ...recoveryForm, amountInvolved: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Action Type</label>
                                        <select
                                            className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                            onChange={e => setRecoveryForm({ ...recoveryForm, type: e.target.value })}
                                        >
                                            <option value="SARFAESI">SARFAESI Notice</option>
                                            <option value="DRT">DRT / OA Filing</option>
                                            <option value="OTS">OTS Proposal</option>
                                            <option value="CIVIL_SUIT">Civil Recovery Suit</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Related Branch</label>
                                    <select
                                        required className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                        onChange={e => setRecoveryForm({ ...recoveryForm, branchId: e.target.value })}
                                    >
                                        <option value="">Select Branch...</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.nameEn} ({b.code})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Current Status</label>
                                    <select
                                        className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                        onChange={e => setRecoveryForm({ ...recoveryForm, status: e.target.value })}
                                    >
                                        <option value="NOTIFIED">Notice Sent</option>
                                        <option value="POSSESSION_TAKEN">Possession Taken</option>
                                        <option value="AUCTION_PENDING">Auction Scheduled</option>
                                        <option value="SETTLED">OTS Settled</option>
                                    </select>
                                </div>
                                <button type="submit" className="w-full bg-bank-teal text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center space-x-2 mt-4 hover:scale-[1.02] transition-all">
                                    <Save size={18} /> <span>Record Action</span>
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-bank-navy/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setShowForm(false)} />
            )}
        </div>
    );
};

export default LegalManager;
