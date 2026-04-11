import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, ChevronRight, Calendar, Clock, Edit2, Trash2, Globe, AlertCircle, CheckCircle2, MoreVertical, X, Filter, LayoutGrid, List as ListIcon, FileText } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const QUILL_MODULES = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'image'],
        ['clean']
    ],
};

const QUILL_FORMATS = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link', 'image'
];

interface Activity {
    id: string;
    titleEn: string;
    titleTa?: string;
    titleHi?: string;
    description?: string;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'ADHOC';
    dueDate?: string;
    status: 'ACTIVE' | 'INACTIVE';
}

interface Manual {
    id: string;
    titleEn: string;
    titleTa?: string;
    titleHi?: string;
    description?: string;
    departmentId: string;
    department?: { nameEn: string, code: string };
    activities: Activity[];
    updatedAt: string;
}

interface Department {
    id: string;
    nameEn: string;
    code: string;
}

const FREQUENCY_CONFIG: Record<string, { label: string, color: string, bg: string }> = {
    'DAILY': { label: 'Daily', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
    'WEEKLY': { label: 'Weekly', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
    'MONTHLY': { label: 'Monthly', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-100' },
    'QUARTERLY': { label: 'Quarterly', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
    'HALF_YEARLY': { label: 'Half Yearly', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
    'YEARLY': { label: 'Yearly', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-100' },
    'ADHOC': { label: 'Ad-hoc', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-100' },
};

const DepartmentManuals: React.FC = () => {
    const { user } = useAuth();
    const [manuals, setManuals] = useState<Manual[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDeptId, setFilterDeptId] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedManual, setSelectedManual] = useState<Manual | null>(null);
    
    // Modal state
    const [showManualModal, setShowManualModal] = useState(false);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [showProfessionalView, setShowProfessionalView] = useState(false);
    const [manualForm, setManualForm] = useState({ 
        titleEn: '', titleTa: '', titleHi: '', description: '', 
        departmentId: user?.departmentId || '' 
    });
    const [activityForm, setActivityForm] = useState({ 
        titleEn: '', titleTa: '', titleHi: '', description: '', 
        frequency: 'MONTHLY', dueDate: '', status: 'ACTIVE' 
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [manRes, depRes] = await Promise.all([
                api.get('/manuals'),
                api.get('/departments')
            ]);
            setManuals(manRes.data);
            setDepartments(depRes.data);

            if (selectedManual) {
                const updated = manRes.data.find((m: Manual) => m.id === selectedManual.id);
                if (updated) setSelectedManual(updated);
            }
        } catch (err) {
            console.error('Failed to fetch manuals:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredManuals = manuals.filter(m => {
        const matchesSearch = m.titleEn.toLowerCase().includes(search.toLowerCase()) ||
                             m.department?.nameEn.toLowerCase().includes(search.toLowerCase());
        const matchesDept = filterDeptId === 'all' || m.departmentId === filterDeptId;
        return matchesSearch && matchesDept;
    });

    const handleSaveManual = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...manualForm,
                departmentId: user?.role === 'ADMIN' ? manualForm.departmentId : user?.departmentId
            };

            if (editingId) {
                await api.put(`/manuals/${editingId}`, payload);
            } else {
                await api.post('/manuals', payload);
            }
            setShowManualModal(false);
            setManualForm({ 
                titleEn: '', titleTa: '', titleHi: '', description: '', 
                departmentId: user?.departmentId || '' 
            });
            setEditingId(null);
            fetchData();
        } catch (err) {
            alert('Failed to save manual');
        }
    };

    const handleSaveActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedManual) return;
        try {
            if (editingId) {
                await api.put(`/manuals/activities/${editingId}`, activityForm);
            } else {
                await api.post(`/manuals/${selectedManual.id}/activities`, activityForm);
            }
            setShowActivityModal(false);
            setActivityForm({ 
                titleEn: '', titleTa: '', titleHi: '', description: '', 
                frequency: 'MONTHLY', dueDate: '', status: 'ACTIVE' 
            });
            setEditingId(null);
            fetchData();
        } catch (err) {
            alert('Failed to save activity');
        }
    };

    const handleDeleteManual = async (id: string) => {
        if (!window.confirm('Delete this manual and all its activities?')) return;
        try {
            await api.delete(`/manuals/${id}`);
            if (selectedManual?.id === id) setSelectedManual(null);
            fetchData();
        } catch (err) {
            alert('Delete failed');
        }
    };

    const handleDeleteActivity = async (id: string) => {
        if (!window.confirm('Remove this activity?')) return;
        try {
            await api.delete(`/manuals/activities/${id}`);
            fetchData();
        } catch (err) {
            alert('Delete failed');
        }
    };

    const isAuthorized = user?.role === 'ADMIN' || user?.role === 'RO_USER';

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-bank-navy tracking-tight uppercase flex items-center gap-3">
                        <BookOpen className="text-bank-gold" size={28} />
                        Departmental Manuals
                    </h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1 leading-none">
                        Standard Operating Procedures & Recurring Activities
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative group min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-bank-teal transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Search manuals..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-bank-teal/5 focus:border-bank-teal transition-all text-xs font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-3 py-1.5 shadow-sm">
                        <Filter size={14} className="text-gray-400" />
                        <select
                            value={filterDeptId}
                            onChange={(e) => setFilterDeptId(e.target.value)}
                            className="border-none bg-transparent text-[10px] font-black uppercase tracking-widest text-bank-navy focus:ring-0 cursor-pointer"
                        >
                            <option value="all">All Departments</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.nameEn}</option>
                            ))}
                        </select>
                    </div>
                    
                    <button 
                        onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                        className="p-2 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-bank-navy transition-all shadow-sm"
                    >
                        {viewMode === 'grid' ? <ListIcon size={18} /> : <LayoutGrid size={18} />}
                    </button>

                    {isAuthorized && (
                        <button 
                            onClick={() => { setEditingId(null); setManualForm({ titleEn: '', titleTa: '', titleHi: '', description: '', departmentId: user?.departmentId || '' }); setShowManualModal(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-bank-navy text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-opacity-90 shadow-lg shadow-bank-navy/20 transition-all active:scale-95"
                        >
                            <Plus size={16} />
                            Create Manual
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 opacity-40">
                    <div className="w-12 h-12 border-4 border-bank-teal/20 border-t-bank-teal rounded-full animate-spin mb-4" />
                    <p className="font-black text-[10px] uppercase tracking-widest text-bank-navy">Accessing Vault...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Manuals List Sidebar */}
                    <div className={cn("lg:col-span-4 space-y-4", selectedManual && "hidden lg:block")}>
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Available Guides</h3>
                            <span className="text-[10px] font-black bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full">{filteredManuals.length}</span>
                        </div>
                        
                        <div className="space-y-3">
                            {filteredManuals.map(manual => (
                                <button
                                    key={manual.id}
                                    onClick={() => setSelectedManual(manual)}
                                    className={cn(
                                        "w-full text-left p-5 rounded-[2rem] border transition-all duration-300 group relative overflow-hidden",
                                        selectedManual?.id === manual.id 
                                            ? "bg-bank-navy border-bank-navy shadow-xl shadow-bank-navy/20" 
                                            : "bg-white border-gray-100 hover:border-bank-teal/40 hover:shadow-lg hover:-translate-y-1"
                                    )}
                                >
                                    <div className="flex items-start justify-between mb-3 relative z-10">
                                        <div className={cn(
                                            "w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                                            selectedManual?.id === manual.id ? "bg-white/10 text-bank-gold" : "bg-gray-50 text-bank-navy"
                                        )}>
                                            <BookOpen size={20} />
                                        </div>
                                        <div className={cn(
                                            "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider border",
                                            selectedManual?.id === manual.id ? "text-bank-gold border-bank-gold/30" : "text-bank-teal border-bank-teal/20 bg-bank-teal/5"
                                        )}>
                                            {manual.department?.code || 'DEP'}
                                        </div>
                                    </div>
                                    
                                    <h4 className={cn(
                                        "font-black text-base tracking-tight mb-2 relative z-10",
                                        selectedManual?.id === manual.id ? "text-white" : "text-bank-navy"
                                    )}>
                                        {manual.titleEn}
                                    </h4>
                                    
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={cn(
                                            "flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest opacity-60",
                                            selectedManual?.id === manual.id ? "text-white" : "text-gray-400"
                                        )}>
                                            <ListIcon size={12} />
                                            {manual.activities.length} Steps
                                        </div>
                                        <div className={cn(
                                            "flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest opacity-60",
                                            selectedManual?.id === manual.id ? "text-white" : "text-gray-400"
                                        )}>
                                            <Calendar size={12} />
                                            {format(new Date(manual.updatedAt), 'MMM dd')}
                                        </div>
                                    </div>

                                    {selectedManual?.id === manual.id && (
                                        <div className="absolute -bottom-4 -right-4 text-white/5 rotate-12">
                                            <Globe size={120} />
                                        </div>
                                    )}
                                </button>
                            ))}
                            
                            {filteredManuals.length === 0 && (
                                <div className="text-center py-12 bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200">
                                    <AlertCircle className="mx-auto text-gray-300 mb-2" size={32} />
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No manuals found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Manual Detail View */}
                    <div className={cn("lg:col-span-8", !selectedManual && "hidden lg:flex flex-col items-center justify-center bg-gray-50/30 rounded-[3rem] border border-dashed border-gray-200 py-32")}>
                        {selectedManual ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                {/* Detail Header */}
                                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/50 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                                        <Globe size={180} className="text-bank-navy" />
                                    </div>
                                    
                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-6">
                                            <button 
                                                onClick={() => setSelectedManual(null)}
                                                className="lg:hidden p-2 text-gray-400 hover:text-bank-navy mb-4 -ml-2"
                                            >
                                                <X size={24} />
                                            </button>
                                            
                                            {isAuthorized && (selectedManual.departmentId === user?.departmentId || user?.role === 'ADMIN') && (
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => { 
                                                            setEditingId(selectedManual.id); 
                                                            setManualForm({ 
                                                                titleEn: selectedManual.titleEn, 
                                                                titleTa: selectedManual.titleTa || '', 
                                                                titleHi: selectedManual.titleHi || '', 
                                                                description: selectedManual.description || '', 
                                                                departmentId: selectedManual.departmentId 
                                                            }); 
                                                            setShowManualModal(true); 
                                                        }}
                                                        className="p-2.5 text-gray-400 hover:text-bank-teal hover:bg-bank-teal/5 rounded-2xl transition-all"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteManual(selectedManual.id)}
                                                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mb-8">
                                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                                <h2 className="text-3xl font-black text-bank-navy tracking-tight">{selectedManual.titleEn}</h2>
                                                <div className="px-3 py-1 bg-bank-navy text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-md">
                                                    {selectedManual.department?.nameEn}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-6 mt-3">
                                                {selectedManual.titleTa && <p className="font-tamil text-bank-teal text-lg leading-none">{selectedManual.titleTa}</p>}
                                                {selectedManual.titleHi && <p className="font-hindi text-bank-gold text-lg leading-none">{selectedManual.titleHi}</p>}
                                            </div>
                                            
                                            {selectedManual.description && (
                                                <div 
                                                    className="text-gray-500 text-sm leading-relaxed max-w-2xl mt-4 font-medium quill-content"
                                                    dangerouslySetInnerHTML={{ __html: selectedManual.description }}
                                                />
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                                            <h3 className="text-xs font-black text-bank-navy uppercase tracking-widest flex items-center gap-2">
                                                <ListIcon size={14} className="text-bank-gold" />
                                                Operational Activities
                                            </h3>

                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => setShowProfessionalView(true)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-bank-navy rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-gray-50 shadow-sm transition-all active:scale-95"
                                                >
                                                    <FileText size={14} className="text-bank-teal" />
                                                    View as Document
                                                </button>
                                                
                                                {isAuthorized && (selectedManual.departmentId === user?.departmentId || user?.role === 'ADMIN') && (
                                                    <button 
                                                        onClick={() => { 
                                                            setEditingId(null); 
                                                            setActivityForm({ 
                                                                titleEn: '', titleTa: '', titleHi: '', description: '', 
                                                                frequency: 'MONTHLY', dueDate: '', status: 'ACTIVE' 
                                                            }); 
                                                            setShowActivityModal(true); 
                                                        }}
                                                        className="flex items-center gap-2 px-4 py-2 bg-bank-teal text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-opacity-90 shadow-lg shadow-bank-teal/20 transition-all active:scale-95"
                                                    >
                                                        <Plus size={14} />
                                                        Add Activity
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Activities Timeline/List */}
                                <div className="space-y-4 px-2 overflow-y-auto max-h-[500px] custom-scrollbar pb-10">
                                    {selectedManual.activities.map((activity, idx) => {
                                        const freq = FREQUENCY_CONFIG[activity.frequency] || FREQUENCY_CONFIG['ADHOC'];
                                        return (
                                            <div 
                                                key={activity.id}
                                                className="group relative bg-white p-6 rounded-[2.5rem] border border-gray-100 hover:border-bank-teal/30 transition-all hover:shadow-xl hover:shadow-gray-100 hover:-translate-x-1"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-5">
                                                        <div className={cn(
                                                            "w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-all duration-500 group-hover:bg-bank-teal group-hover:border-bank-teal group-hover:text-white shadow-sm",
                                                            freq.bg, freq.color
                                                        )}>
                                                            <Calendar size={22} className="transition-colors group-hover:text-white" />
                                                        </div>
                                                        
                                                        <div className="pt-1">
                                                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                                                <h4 className="font-black text-bank-navy tracking-tight">{activity.titleEn}</h4>
                                                                <span className={cn(
                                                                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all group-hover:bg-white group-hover:scale-105",
                                                                    freq.bg, freq.color
                                                                )}>
                                                                    {freq.label}
                                                                </span>
                                                            </div>
                                                            
                                                            <div className="flex flex-col gap-1 mb-3">
                                                                {activity.titleTa && <p className="font-tamil text-gray-400 text-sm">{activity.titleTa}</p>}
                                                                {activity.titleHi && <p className="font-hindi text-gray-400 text-sm">{activity.titleHi}</p>}
                                                            </div>

                                                            {activity.description && (
                                                                <div 
                                                                    className="text-gray-500 text-[11px] leading-relaxed max-w-xl mb-3 quill-content"
                                                                    dangerouslySetInnerHTML={{ __html: activity.description }}
                                                                />
                                                            )}
                                                            
                                                            <div className="flex items-center gap-4">
                                                                {activity.dueDate && (
                                                                    <div className="flex items-center gap-2 text-[9px] font-bold text-bank-gold uppercase tracking-widest bg-bank-gold/5 px-2 py-1 rounded-lg">
                                                                        <Clock size={12} />
                                                                        Target: {activity.dueDate}
                                                                    </div>
                                                                )}
                                                                <div className={cn(
                                                                    "flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest",
                                                                    activity.status === 'ACTIVE' ? "text-emerald-500" : "text-rose-400"
                                                                )}>
                                                                    <CheckCircle2 size={12} />
                                                                    Status: {activity.status}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isAuthorized && (selectedManual.departmentId === user?.departmentId || user?.role === 'ADMIN') && (
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => { 
                                                                    setEditingId(activity.id); 
                                                                    setActivityForm({ 
                                                                        titleEn: activity.titleEn, 
                                                                        titleTa: activity.titleTa || '', 
                                                                        titleHi: activity.titleHi || '', 
                                                                        description: activity.description || '', 
                                                                        frequency: activity.frequency, 
                                                                        dueDate: activity.dueDate || '',
                                                                        status: activity.status
                                                                    }); 
                                                                    setShowActivityModal(true); 
                                                                }}
                                                                className="p-2 text-gray-400 hover:text-bank-teal transition-colors"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteActivity(activity.id)}
                                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {selectedManual.activities.length === 0 && (
                                        <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-gray-100">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <LayoutGrid className="text-gray-200" size={32} />
                                            </div>
                                            <p className="text-xs font-black text-gray-300 uppercase tracking-widest">No activities defined yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-gray-200 shadow-inner mb-6 ring-8 ring-white/50">
                                    <BookOpen size={40} />
                                </div>
                                <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Manuals Vault</h2>
                                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest max-w-[200px] text-center leading-relaxed">
                                    Select a manual from the left to view standard operating procedures and activities.
                                </p>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Manual Modal */}
            {showManualModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bank-navy/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#fcfcfc] rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
                        <div className="p-10 bg-bank-navy text-white relative">
                            <div className="absolute top-0 right-0 p-10 opacity-[0.05] rotate-12">
                                <Plus size={120} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                {editingId ? 'EDIT MANUAL' : 'CREATE NEW MANUAL'}
                            </h2>
                            <p className="text-[10px] font-bold text-bank-gold uppercase tracking-[0.25em] mt-2 opacity-80">
                                Define scope and trilingual identifiers
                            </p>
                        </div>
                        
                        <form onSubmit={handleSaveManual} className="p-10 space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                {isAuthorized && (
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Owning Department</label>
                                        <select
                                            required
                                            value={manualForm.departmentId}
                                            onChange={e => setManualForm({ ...manualForm, departmentId: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-bank-navy/5 focus:bg-white transition-all font-black text-xs text-bank-navy uppercase tracking-widest"
                                        >
                                            <option value="">Select Department</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>{d.nameEn}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">English Title</label>
                                    <input
                                        required
                                        value={manualForm.titleEn}
                                        onChange={e => setManualForm({ ...manualForm, titleEn: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-bank-teal/5 focus:bg-white transition-all font-bold text-bank-navy"
                                        placeholder="e.g. Branch Audit SOP"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 font-tamil">தமிழ் தலைப்பு</label>
                                        <input
                                            value={manualForm.titleTa}
                                            onChange={e => setManualForm({ ...manualForm, titleTa: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-bank-teal/5 focus:bg-white transition-all font-medium font-tamil text-bank-teal"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 font-hindi">हिंदी शीर्षक</label>
                                        <input
                                            value={manualForm.titleHi}
                                            onChange={e => setManualForm({ ...manualForm, titleHi: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-bank-teal/5 focus:bg-white transition-all font-medium font-hindi text-bank-gold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Scope/Description / SOP Overview</label>
                                    <div className="bg-gray-100 rounded-2xl overflow-hidden border-none focus-within:ring-4 focus-within:ring-bank-teal/5 focus-within:bg-white transition-all">
                                        <ReactQuill
                                            theme="snow"
                                            value={manualForm.description}
                                            onChange={content => setManualForm({ ...manualForm, description: content })}
                                            modules={QUILL_MODULES}
                                            formats={QUILL_FORMATS}
                                            placeholder="Detailed scope, objectives, and overview..."
                                            className="bg-transparent border-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-6">
                                <button type="button" onClick={() => setShowManualModal(false)} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                                <button type="submit" className="px-10 py-3.5 bg-bank-navy text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-bank-navy/20 active:scale-95 transition-all">
                                    {editingId ? 'Update Manual' : 'Confirm & Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Activity Modal */}
            {showActivityModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bank-teal/20 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-500 border border-bank-teal/10">
                        <div className="p-10 bg-bank-teal text-white relative">
                            <div className="absolute top-0 right-0 p-10 opacity-10">
                                <ListIcon size={120} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight flex items-center gap-4 font-mono">
                                {editingId ? 'UPDATE STEP' : 'NEW SOP STEP'}
                            </h2>
                            <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.25em] mt-2 leading-none">
                                Define frequency and reporting schedule
                            </p>
                        </div>
                        
                        <form onSubmit={handleSaveActivity} className="p-10 space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Activity Title / Action</label>
                                    <input
                                        required
                                        value={activityForm.titleEn}
                                        onChange={e => setActivityForm({ ...activityForm, titleEn: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-bank-teal/5 focus:bg-white transition-all font-bold text-bank-navy"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Frequency</label>
                                        <select
                                            value={activityForm.frequency}
                                            onChange={e => setActivityForm({ ...activityForm, frequency: e.target.value as any })}
                                            className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-bank-teal/5 focus:bg-white transition-all font-black text-[10px] uppercase tracking-widest text-indigo-700"
                                        >
                                            {Object.entries(FREQUENCY_CONFIG).map(([val, { label }]) => (
                                                <option key={val} value={val}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Milestone</label>
                                        <input
                                            value={activityForm.dueDate}
                                            onChange={e => setActivityForm({ ...activityForm, dueDate: e.target.value })}
                                            className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-bank-teal/5 focus:bg-white transition-all font-bold text-bank-gold text-xs"
                                            placeholder="5th of Month"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Status</label>
                                        <select
                                            value={activityForm.status}
                                            onChange={e => setActivityForm({ ...activityForm, status: e.target.value })}
                                            className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-2xl focus:ring-4 focus:ring-bank-teal/5 focus:bg-white transition-all font-black text-[10px] uppercase tracking-widest text-emerald-600"
                                        >
                                            <option value="ACTIVE">Active</option>
                                            <option value="INACTIVE">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Detailed Instructions / Procedure Steps</label>
                                    <div className="bg-gray-100 rounded-2xl overflow-hidden border-none focus-within:ring-4 focus-within:ring-bank-teal/5 focus-within:bg-white transition-all">
                                        <ReactQuill
                                            theme="snow"
                                            value={activityForm.description}
                                            onChange={content => setActivityForm({ ...activityForm, description: content })}
                                            modules={QUILL_MODULES}
                                            formats={QUILL_FORMATS}
                                            placeholder="Outline specific steps, documentation required, and verification process..."
                                            className="bg-transparent border-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-6">
                                <button type="button" onClick={() => setShowActivityModal(false)} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                                <button type="submit" className="px-10 py-3.5 bg-bank-teal text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-bank-teal/20 active:scale-95 transition-all">
                                    {editingId ? 'Update Procedure' : 'Add to Manual'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Professional Document View */}
            {showProfessionalView && selectedManual && (
                <div className="fixed inset-0 z-[200] flex items-start justify-center p-0 md:p-10 bg-bank-navy/90 backdrop-blur-xl animate-in fade-in duration-500 overflow-y-auto custom-scrollbar">
                    <div className="bg-white w-full max-w-4xl shadow-2xl relative animate-in slide-in-from-bottom-10 duration-700 min-h-screen md:min-h-[11in] flex flex-col">
                        {/* Close Button */}
                        <button 
                            onClick={() => setShowProfessionalView(false)}
                            className="absolute top-6 right-6 p-3 bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all shadow-sm z-50 no-print"
                        >
                            <X size={24} />
                        </button>

                        <div className="p-16 flex-grow flex flex-col">
                            {/* Document Header */}
                            <div className="text-center mb-12 border-b-2 border-bank-navy pb-8">
                                <h1 className="text-2xl font-black text-bank-navy tracking-widest uppercase mb-1">Standard Operating Procedure</h1>
                                <p className="text-[10px] font-bold text-bank-teal uppercase tracking-[0.4em] mb-6">Operations & Compliance Division</p>
                                
                                <div className="space-y-1">
                                    <h2 className="text-xl font-black text-bank-navy tracking-tight uppercase">{selectedManual.titleEn}</h2>
                                    {selectedManual.titleTa && <p className="font-tamil text-bank-navy text-lg">{selectedManual.titleTa}</p>}
                                    {selectedManual.titleHi && <p className="font-hindi text-bank-navy text-lg">{selectedManual.titleHi}</p>}
                                </div>
                                <div className="mt-4 inline-block px-4 py-1 bg-bank-navy text-white text-[9px] font-black rounded-full uppercase tracking-widest">
                                    Dept: {selectedManual.department?.nameEn}
                                </div>
                            </div>

                            {/* Document Meta */}
                            <div className="grid grid-cols-2 gap-8 mb-12 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                <div className="space-y-2">
                                    <div className="flex justify-between border-b border-gray-100 pb-1">
                                        <span>Reference Code</span>
                                        <span className="text-bank-navy font-black">MAN/{selectedManual.department?.code}/{(selectedManual.id.substring(0, 4)).toUpperCase()}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 pb-1">
                                        <span>Issued Date</span>
                                        <span className="text-bank-navy font-black">{format(new Date(selectedManual.createdAt), 'dd MMM yyyy')}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between border-b border-gray-100 pb-1">
                                        <span>Last Updated</span>
                                        <span className="text-bank-navy font-black">{format(new Date(selectedManual.updatedAt), 'dd MMM yyyy')}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 pb-1">
                                        <span>Security Level</span>
                                        <span className="text-bank-teal font-black">INTERNAL USE ONLY</span>
                                    </div>
                                </div>
                            </div>

                            {/* Objective Section */}
                            <div className="mb-12">
                                <h3 className="text-xs font-black text-bank-navy uppercase tracking-widest border-l-4 border-bank-gold pl-3 mb-4">1. Objective & Scope</h3>
                                <div 
                                    className="text-sm text-gray-600 leading-relaxed font-medium quill-content"
                                    dangerouslySetInnerHTML={{ __html: selectedManual.description || 'This manual outlines the standard operating procedures and recurring activities mandated for the concerned department to ensure operational consistency and compliance.' }}
                                />
                            </div>

                            {/* Activities Table */}
                            <div className="mb-12 flex-grow">
                                <h3 className="text-xs font-black text-bank-navy uppercase tracking-widest border-l-4 border-bank-gold pl-3 mb-6">2. Operational Procedures</h3>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-bank-navy border-b border-gray-200">
                                                <th className="px-6 py-4">Activity / Task</th>
                                                <th className="px-6 py-4">Frequency</th>
                                                <th className="px-6 py-4">Milestone</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs">
                                            {selectedManual.activities.map((activity, idx) => (
                                                <tr key={activity.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-5">
                                                        <p className="font-bold text-bank-navy mb-1">{activity.titleEn}</p>
                                                        {activity.description && (
                                                            <div 
                                                                className="text-[10px] text-gray-500 leading-tight quill-content"
                                                                dangerouslySetInnerHTML={{ __html: activity.description }}
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="px-2 py-1 bg-gray-100 text-bank-navy rounded text-[9px] font-bold uppercase tracking-wider">
                                                            {activity.frequency}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="text-bank-gold font-black uppercase tracking-widest text-[10px]">
                                                            {activity.dueDate || 'AS APPLICABLE'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {selectedManual.activities.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-10 text-center text-gray-400 font-bold uppercase tracking-widest italic">
                                                        No procedures defined in this manual version.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Signature Section */}
                            <div className="mt-20 pt-12 border-t-2 border-dashed border-gray-100 grid grid-cols-2 gap-20">
                                <div className="text-center">
                                    <div className="h-20 w-48 mx-auto border-b border-gray-300 mb-4 opacity-10 flex items-center justify-center">
                                        <span className="text-[8px] uppercase tracking-widest">Signatory Space</span>
                                    </div>
                                    <p className="text-[10px] font-black text-bank-navy uppercase tracking-[0.2em]">Regional Office Head</p>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Approving Authority</p>
                                </div>
                                <div className="text-center">
                                    <div className="h-20 w-48 mx-auto border-b border-gray-300 mb-4 opacity-10 flex items-center justify-center">
                                        <span className="text-[8px] uppercase tracking-widest">Seal Space</span>
                                    </div>
                                    <p className="text-[10px] font-black text-bank-navy uppercase tracking-[0.2em]">{selectedManual.department?.nameEn}</p>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Owning Department</p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="mt-24 text-center">
                                <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.5em]">Digitally Generated Document • Non-Transferable</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentManuals;
