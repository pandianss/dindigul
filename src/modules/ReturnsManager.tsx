import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    Calendar, 
    MapPin, 
    User as UserIcon, 
    Plus, 
    Trash2, 
    FileText, 
    Download, 
    CheckCircle2,
    Clock,
    PlusCircle,
    Building2,
    Shield,
    X,
    FileSearch
} from 'lucide-react';
import { formatLocalISO } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';

const API_BASE = '/api';

interface Branch {
    id: string;
    code: string;
    nameEn: string;
    populationGroup: string;
    type?: string;
}

interface Visit {
    id: string;
    visitDate: string;
    branchId: string;
    visitorId: string;
    purpose: string;
    observations?: string;
    visitorCategory: string;
    branch: { nameEn: string; code: string };
    visitor: { fullNameEn: string };
}

interface User {
    id: string;
    fullNameEn: string;
    role: string;
}

const ReturnsManager: React.FC = () => {
    const { user } = useAuth();
    
    const [branches, setBranches] = useState<Branch[]>([]);
    const [staff, setStaff] = useState<User[]>([]);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(false);
    const [showLogForm, setShowLogForm] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
    const [preparerId, setPreparerId] = useState('');
    const [signatoryId, setSignatoryId] = useState('');
    
    // Diagnostic stats to display in UI for debugging
    const [debug, setDebug] = useState({ bRaw: 0, sRaw: 0, bFiltered: 0, error: '' });

    const [formData, setFormData] = useState({
        branchId: '',
        visitorId: user?.id || '',
        visitDate: formatLocalISO(new Date()),
        purpose: '',
        observations: '',
        visitorCategory: 'SECOND_LINE'
    });

    const fetchData = async () => {
        setLoading(true);
        setDebug(prev => ({ ...prev, error: '' }));
        try {
            // Individual fetch with error handling for each
            const [bRes, sRes, vRes] = await Promise.allSettled([
                api.get(`/branches?limit=2000`),
                api.get(`/users?limit=2000`),
                api.get(`/visits`)
            ]);

            let finalBranches: Branch[] = [];
            let finalStaff: User[] = [];
            let finalVisits: Visit[] = [];

            if (bRes.status === 'fulfilled') {
                const raw = bRes.value.data || [];
                setDebug(p => ({ ...p, bRaw: raw.length }));
                // Permissive filter: match anything with 'branch' or 'unit' or no type
                finalBranches = raw.filter((b: any) => 
                    !b.type || 
                    b.type.toUpperCase().includes('BRANCH') || 
                    b.type.toUpperCase().includes('UNIT') || 
                    b.type.toUpperCase() === 'B'
                );
                setDebug(p => ({ ...p, bFiltered: finalBranches.length }));
            }

            if (sRes.status === 'fulfilled') {
                const data = sRes.value.data.data || sRes.value.data || [];
                finalStaff = Array.isArray(data) ? data : [];
                setDebug(p => ({ ...p, sRaw: finalStaff.length }));
            }

            if (vRes.status === 'fulfilled') {
                finalVisits = Array.isArray(vRes.value.data) ? vRes.value.data : [];
            }

            setBranches(finalBranches);
            setStaff(finalStaff);
            setVisits(finalVisits);

        } catch (error: any) {
            console.error('Fetch error:', error);
            setDebug(p => ({ ...p, error: error.message }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleLogVisit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/visits`, formData);
            setShowLogForm(false);
            setFormData({ ...formData, branchId: '', purpose: '', observations: '' });
            fetchData();
        } catch (error) {
            alert('Failed to log visit');
        }
    };

    const handleDeleteVisit = async (id: string) => {
        if (!window.confirm('Delete this visit record?')) return;
        try {
            await api.delete(`/visits/${id}`);
            fetchData();
        } catch (error) {
            alert('Deletion failed');
        }
    };

    const handleDownloadReport = async (type: 'business' | 'visits' | 'observation', visitId?: string) => {
        try {
            let url = '';
            let filename = '';
            if (type === 'business') {
                const date = formatLocalISO(new Date());
                url = `/returns/generate?date=${date}`;
                filename = `Business_Return_${date}.pdf`;
            } else if (type === 'visits') {
                url = `/returns/generate-visits?month=${selectedMonth}&preparerId=${preparerId}&signatoryId=${signatoryId}`;
                filename = `Branch_Visits_${selectedMonth}.pdf`;
            } else {
                url = `/returns/generate-visit-letter/${visitId}`;
                filename = `Observation_Letter_${visitId}.pdf`;
            }

            const res = await api.get(url, { responseType: 'blob' });
            const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert('Failed to generate report');
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto pb-24">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                        <Shield className="w-10 h-10 text-indigo-600" />
                        Returns Command Center
                    </h1>
                    <div className="flex items-center gap-4 mt-2 ml-1">
                        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Statutory & Performance Compliance Hub</p>
                        <span className="text-[10px] font-black text-slate-300">
                            Status: {debug.bRaw} Branches | {debug.sRaw} Staff | {debug.bFiltered} Units Available
                        </span>
                    </div>
                </div>
                
                <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
                    <button 
                        onClick={() => setShowLogForm(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-100"
                    >
                        <PlusCircle size={18} />
                        Log Branch Visit
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">Generated returns</h2>
                    
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden hover:border-indigo-200 transition-all p-8 group">
                        <div className="flex items-center gap-5 mb-6">
                            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                                <Building2 size={24} />
                            </div>
                            <div>
                                <h3 className="font-black text-xl text-slate-800">Branch Visits</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Consolidated Monthly Visit Report</p>
                            </div>
                        </div>
                        
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Reporting Month</label>
                                <input 
                                    type="month" 
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Report Preparer (AGM/CM)</label>
                                <select 
                                    className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-slate-700 text-sm focus:ring-2 focus:ring-indigo-100"
                                    value={preparerId}
                                    onChange={(e) => setPreparerId(e.target.value)}
                                >
                                    <option value="">Auto-Detect Signatory</option>
                                    {staff.map(s => (
                                        <option key={s.id} value={s.id}>{s.fullNameEn}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Final Signatory (SRM/RM)</label>
                                <select 
                                    className="w-full bg-slate-50 border-none rounded-xl p-3 font-bold text-slate-700 text-sm focus:ring-2 focus:ring-indigo-100"
                                    value={signatoryId}
                                    onChange={(e) => setSignatoryId(e.target.value)}
                                >
                                    <option value="">Region Head (Default)</option>
                                    {staff.map(s => (
                                        <option key={s.id} value={s.id}>{s.fullNameEn}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button 
                            onClick={() => handleDownloadReport('visits')}
                            className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-4 rounded-xl font-black hover:bg-slate-800 transition-all shadow-lg"
                        >
                            <Download size={20} />
                            Generate Return PDF
                        </button>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden hover:opacity-90 transition-all p-8 group">
                        <div className="flex items-center gap-5 mb-6">
                            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                                <FileText size={24} />
                            </div>
                            <div>
                                <h3 className="font-black text-xl text-slate-800">Business Snapshot</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Monthly Consolidated Performance</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleDownloadReport('business')}
                            className="w-full flex items-center justify-center gap-3 bg-emerald-600 text-white py-4 rounded-xl font-black hover:opacity-90 transition-all shadow-lg"
                        >
                            <Download size={20} />
                            Generate Return PDF
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Recent visit logs</h2>
                        <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-widest">
                            {visits.length} Total Logs
                        </span>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden min-h-[600px]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-[500px] animate-pulse">
                                <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Accessing Archives...</p>
                            </div>
                        ) : visits.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Visitor</th>
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                                            <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {visits.map(v => (
                                            <tr key={v.id} className="hover:bg-slate-50 transition-colors group/row">
                                                <td className="px-8 py-5">
                                                    <p className="font-bold text-slate-700">{v.branch?.nameEn || 'N/A'}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono">{v.branch?.code}</p>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <p className="font-bold text-slate-700">{v.visitor?.fullNameEn}</p>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                                                        <Calendar size={14} className="text-slate-300" />
                                                        {new Date(v.visitDate).toLocaleDateString('en-GB')}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase ${
                                                        v.visitorCategory === 'FIRST_LINE' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'
                                                    }`}>
                                                        {v.visitorCategory?.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDownloadReport('observation', v.id)}}
                                                            className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                            title="Issue Observation Letter"
                                                        >
                                                            <FileSearch size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteVisit(v.id)}}
                                                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[500px] text-center p-12">
                                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                                    <MapPin size={32} className="text-slate-200" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-400 mb-2">No visits logged yet</h3>
                                <p className="text-sm text-slate-400 max-w-xs">Management visits to branches will appear here after they are logged.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showLogForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/10">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white">
                        <div className="p-8 bg-indigo-600 text-white relative">
                            <button 
                                onClick={() => setShowLogForm(false)}
                                className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                            <h3 className="text-2xl font-black mb-1">Log Branch Visit</h3>
                            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Management Audit Trail</p>
                        </div>
                        
                        <form onSubmit={handleLogVisit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Branch</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-3.5 text-slate-300" size={18} />
                                    <select 
                                        className="w-full bg-slate-50 border-none rounded-xl p-4 pl-12 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100"
                                        value={formData.branchId}
                                        onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Branch</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.code} - {b.nameEn}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Visitor</label>
                                    <select 
                                        className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100"
                                        value={formData.visitorId}
                                        onChange={(e) => setFormData({ ...formData, visitorId: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Staff</option>
                                        {staff.map(s => (
                                            <option key={s.id} value={s.id}>{s.fullNameEn}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Authority Level</label>
                                    <select 
                                        className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100"
                                        value={formData.visitorCategory}
                                        onChange={(e) => setFormData({ ...formData, visitorCategory: e.target.value })}
                                        required
                                    >
                                        <option value="FIRST_LINE">First Line (GM/CRM/SRM)</option>
                                        <option value="SECOND_LINE">Second Line (AGM/CM)</option>
                                    </select>
                                </div>
                            </div>


                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Visit Date</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100"
                                    value={formData.visitDate}
                                    onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observations (Optional)</label>
                                <textarea 
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 min-h-[100px]"
                                    placeholder="Enter key deficiencies or observations requiring branch reply..."
                                    value={formData.observations}
                                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                                />
                            </div>

                            <button 
                                type="submit"
                                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 mt-4"
                            >
                                Confirm Log Entry
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReturnsManager;
