import React, { useState, useEffect } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Search,
    Plus,
    Filter,
    Building2,
    BarChart3,
    Calendar,
    Save,
    AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditObservation {
    id: string;
    auditType: string;
    observation: string;
    riskLevel: string;
    status: string;
    rectificationDetails?: string;
    targetDate: string;
    auditDate: string;
    branch: { nameEn: string; code: string };
}

interface AuditStats {
    total: number;
    pending: number;
    rectified: number;
    highRisk: number;
}

const AuditManager: React.FC = () => {
    const [observations, setObservations] = useState<AuditObservation[]>([]);
    const [stats, setStats] = useState<AuditStats>({ total: 0, pending: 0, rectified: 0, highRisk: 0 });
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filterType, setFilterType] = useState('');
    const [branches, setBranches] = useState<any[]>([]);

    const [form, setForm] = useState({
        auditType: 'CONCURRENT',
        observation: '',
        riskLevel: 'MEDIUM',
        targetDate: format(new Date(), 'yyyy-MM-dd'),
        branchId: '',
        auditDate: format(new Date(), 'yyyy-MM-dd')
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [obsRes, statsRes, branchesRes] = await Promise.all([
                fetch(`http://localhost:5000/api/audit/observations${filterType ? `?auditType=${filterType}` : ''}`),
                fetch('http://localhost:5000/api/audit/stats'),
                fetch('http://localhost:5000/api/branches')
            ]);
            setObservations(await obsRes.json());
            setStats(await statsRes.json());
            setBranches(await branchesRes.json());
        } catch (error) {
            console.error('Error fetching audit data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filterType]);

    const handleSaveObservation = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/api/audit/observations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (response.ok) {
                setShowForm(false);
                fetchData();
            }
        } catch (error) {
            console.error('Error saving observation:', error);
        }
    };

    const handleRectify = async (id: string) => {
        const details = prompt('Enter rectification details:');
        if (!details) return;

        try {
            const response = await fetch(`http://localhost:5000/api/audit/observations/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'RECTIFIED', rectificationDetails: details })
            });
            if (response.ok) {
                fetchData();
            }
        } catch (error) {
            console.error('Error updating observation:', error);
        }
    };

    return (
        <div className="space-y-6 pt-6 h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy font-bank-noto">Audit & Compliance</h2>
                    <p className="text-gray-500 text-sm">Regional monitoring of audit observations & rectification status</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="btn-primary flex items-center space-x-2 bg-bank-navy text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-all text-sm shadow-lg shadow-bank-navy/10"
                >
                    <Plus size={18} />
                    <span>Post Observation</span>
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4 shrink-0">
                <div className="card p-5 border-l-4 border-l-bank-navy">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-bank-navy/5 text-bank-navy rounded-lg">
                            <BarChart3 size={20} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-bank-navy">{stats.total}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Observations</p>
                </div>
                <div className="card p-5 border-l-4 border-l-amber-500">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-amber-500/5 text-amber-500 rounded-lg">
                            <Clock size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pending</span>
                    </div>
                    <p className="text-2xl font-black text-bank-navy">{stats.pending}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Awaiting Rectification</p>
                </div>
                <div className="card p-5 border-l-4 border-l-bank-teal">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-bank-teal/5 text-bank-teal rounded-lg">
                            <CheckCircle2 size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-bank-teal bg-bank-teal/5 px-2 py-0.5 rounded-full">Done</span>
                    </div>
                    <p className="text-2xl font-black text-bank-navy">{stats.rectified}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Observations Rectified</p>
                </div>
                <div className="card p-5 border-l-4 border-l-red-500">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-red-500/5 text-red-500 rounded-lg">
                            <AlertTriangle size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Action Required</span>
                    </div>
                    <p className="text-2xl font-black text-bank-navy">{stats.highRisk}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">High Risk Pending</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col space-y-4 min-h-0">
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm shrink-0">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text" placeholder="Search observations, branches, comments..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-bank-teal/20 rounded-lg text-sm transition-all"
                        />
                    </div>
                    <div className="flex items-center space-x-3">
                        <Filter size={18} className="text-gray-400" />
                        <select
                            onChange={(e) => setFilterType(e.target.value)}
                            className="text-sm border-0 bg-transparent font-bold text-bank-navy focus:ring-0 cursor-pointer"
                        >
                            <option value="">All Audit Types</option>
                            <option value="CONCURRENT">Concurrent Audit</option>
                            <option value="STATUTORY">Statutory Audit</option>
                            <option value="LFAR">LFAR findings</option>
                            <option value="INTERNAL">Internal Audit</option>
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                    {loading ? (
                        <div className="space-y-4 opacity-50">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse"></div>)}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {observations.map(obs => (
                                <div key={obs.id} className="card p-4 hover:shadow-md transition-all flex items-center justify-between group border-l-4 border-l-transparent hover:border-l-bank-teal">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-1">
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${obs.riskLevel === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200' :
                                                obs.riskLevel === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-blue-50 text-blue-700 border-blue-200'
                                                }`}>
                                                {obs.riskLevel} RISK
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">{obs.auditType}</span>
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${obs.status === 'RECTIFIED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{obs.status}</span>
                                        </div>
                                        <p className="text-bank-navy font-medium text-sm leading-relaxed mb-2">{obs.observation}</p>
                                        <div className="flex items-center space-x-6 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                            <span className="flex items-center space-x-1"><Building2 size={12} /> <span>{obs.branch.nameEn} ({obs.branch.code})</span></span>
                                            <span className="flex items-center space-x-1"><Calendar size={12} /> <span>Audit Date: {format(new Date(obs.auditDate), 'dd MMM yyyy')}</span></span>
                                            <span className="flex items-center space-x-1"><Clock size={12} /> <span>Target: {format(new Date(obs.targetDate), 'dd MMM yyyy')}</span></span>
                                        </div>
                                        {obs.rectificationDetails && (
                                            <div className="mt-2 p-2 bg-bank-teal/5 rounded-lg border border-bank-teal/10">
                                                <p className="text-[10px] text-bank-teal font-bold uppercase mb-1">Rectification Details</p>
                                                <p className="text-xs text- bank-navy py-0.5 italic">{obs.rectificationDetails}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {obs.status === 'PENDING' && (
                                            <button
                                                onClick={() => handleRectify(obs.id)}
                                                className="p-2 text-bank-teal hover:bg-bank-teal/5 rounded-full transition-all"
                                                title="Mark as Rectified"
                                            >
                                                <CheckCircle2 size={24} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar Form Overlay */}
            {showForm && (
                <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300 border-l border-gray-100 flex flex-col overflow-hidden">
                    <div className="p-6 bg-bank-navy text-white flex items-center justify-between shrink-0">
                        <div>
                            <h3 className="text-xl font-bold">Post Audit Observation</h3>
                            <p className="text-blue-200 text-xs">Record findings for regional compliance monitoring</p>
                        </div>
                        <button onClick={() => setShowForm(false)} className="text-blue-200 hover:text-white text-2xl">✕</button>
                    </div>

                    <form onSubmit={handleSaveObservation} className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Audit Type</label>
                                <select
                                    className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                    onChange={e => setForm({ ...form, auditType: e.target.value })}
                                >
                                    <option value="CONCURRENT">Concurrent Audit</option>
                                    <option value="STATUTORY">Statutory Audit</option>
                                    <option value="LFAR">LFAR finding</option>
                                    <option value="INTERNAL">Internal Audit</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Risk Level</label>
                                <select
                                    className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                    onChange={e => setForm({ ...form, riskLevel: e.target.value })}
                                >
                                    <option value="HIGH">High Risk</option>
                                    <option value="MEDIUM">Medium Risk</option>
                                    <option value="LOW">Low Risk</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Observation Description</label>
                            <textarea
                                required rows={4} placeholder="Specific finding or deficiency identified..."
                                className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                onChange={e => setForm({ ...form, observation: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Related Branch</label>
                            <select
                                required className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                onChange={e => setForm({ ...form, branchId: e.target.value })}
                            >
                                <option value="">Select Branch...</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.nameEn} ({b.code})</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Audit Date</label>
                                <input
                                    type="date"
                                    className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                    value={form.auditDate}
                                    onChange={e => setForm({ ...form, auditDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Rectification Target</label>
                                <input
                                    type="date" required
                                    className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                    value={form.targetDate}
                                    onChange={e => setForm({ ...form, targetDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start space-x-3">
                            <AlertCircle className="text-amber-500 shrink-0" size={18} />
                            <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                                Posting this observation will flag it on the regional dashboard. Branch managers will be expected to provide rectification proof before the target date.
                            </p>
                        </div>

                        <button type="submit" className="w-full bg-bank-navy text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center space-x-2 text-lg hover:scale-[1.01] transition-all">
                            <Save size={20} />
                            <span>Save Observation</span>
                        </button>
                    </form>
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-bank-navy/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setShowForm(false)} />
            )}
        </div>
    );
};

export default AuditManager;
