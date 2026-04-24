import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
    Settings, Building2, Users, Briefcase, Plus, Save, Trash2, Edit2, 
    X, Hash, Upload, ArrowRightLeft, Calculator, Filter, LogOut 
} from 'lucide-react';

import api from '../../services/api';
import { getErrorMessage } from '../../utils/handleError';
import { cn } from '../../utils/cn';

// Sub-modules from admin
import MISUpload from '../admin/MISUpload';
import BudgetUpload from '../admin/BudgetUpload';
import ParameterManager from '../admin/ParameterManager';
import NoticeManager from '../admin/NoticeManager';
import CommandCenter from '../admin/CommandCenter';
import OrganizationSettings from '../admin/OrganizationSettings';

// Local modular components
import { Tab, MasterItem } from './types';
import { tabGroups, getSingularLabel, getEndpoint } from './constants';
import { DepartmentForm } from './components/DepartmentForm';
import { DesignationForm } from './components/DesignationForm';
import { UnitForm } from './components/UnitForm';
import { StaffForm } from './components/StaffForm';
import { ATMForm } from './components/ATMForm';
import { AuditLogView } from './components/AuditLogView';
import { TransferModal } from './components/TransferModal';
import { PartnerForm } from './components/PartnerForm';
import { AssetForm } from './components/AssetForm';
import { LockerForm } from './components/LockerForm';

const SettingsManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('departments');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<MasterItem[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditLogsTotal, setAuditLogsTotal] = useState(0);
    const [auditEventFilter, setAuditEventFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
    const [transferItem, setTransferItem] = useState<MasterItem | null>(null);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferData, setTransferData] = useState({ branchId: '', designationId: '', remarks: '' });
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dbHealth, setDbHealth] = useState<{ status: string; count?: number; error?: string } | null>(null);

    // Shared Master Data for selections
    const [designations, setDesignations] = useState<MasterItem[]>([]);
    const [branches, setBranches] = useState<MasterItem[]>([]);
    const [departments, setDepartments] = useState<MasterItem[]>([]);
    const [formData, setFormData] = useState<MasterItem>({});
    const [uploadingSeal, setUploadingSeal] = useState(false);

    const filteredGroups = tabGroups.map(group => ({
        ...group,
        tabs: group.tabs.filter(tab => 
            tab.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
            tab.id.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(group => group.tabs.length > 0);

    const fetchData = useCallback(async () => {
        if (['misUpload', 'budgets', 'registry', 'bulletins', 'command'].includes(activeTab)) return;
        setLoading(true);
        setError(null);
        try {
            const endpoint = getEndpoint(activeTab);
            const query = (activeTab === 'staff' || activeTab === 'atms') ? '?limit=1000' : '';
            const res = await api.get(`${endpoint}${query}`);
            console.log(`[Frontend/Fetch] Tab: ${activeTab}, Endpoint: ${endpoint}, Data:`, res.data);
            setData(res.data.data || res.data);

            if (['staff', 'atms', 'partners', 'assets', 'lockers'].includes(activeTab)) {
                const [desigRes, branchRes, deptRes] = await Promise.all([
                    api.get('/designations'),
                    api.get('/branches'),
                    api.get('/departments')
                ]);
                setDesignations(desigRes.data);
                setBranches(branchRes.data);
                setDepartments(deptRes.data);
            }
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    const fetchAuditLogs = useCallback(async (eventFilter: string = '') => {
        try {
            const params = eventFilter ? `?event=${eventFilter}` : '';
            const res = await api.get(`/auth/audit-log${params}`);
            setAuditLogs(res.data.logs || []);
            setAuditLogsTotal(res.data.total || 0);
        } catch (err) {
            console.error("Failed to fetch audit logs");
        }
    }, []);

    const fetchSessions = useCallback(async () => {
        try {
            const res = await api.get('/auth/sessions');
            setSessions(res.data);
        } catch (err) {
            console.error("Failed to fetch live sessions");
        }
    }, []);

    const checkDbHealth = useCallback(async () => {
        try {
            const res = await api.get('/health/db');
            setDbHealth(res.data);
        } catch (err: any) {
            setDbHealth({ status: 'disconnected', error: err.message });
        }
    }, []);

    useEffect(() => {
        checkDbHealth();
    }, [checkDbHealth]);

    useEffect(() => {
        setData([]);
        setSessions([]);
        if (activeTab !== 'auditLog') fetchData();
        setShowForm(false);
        setEditingItem(null);
        setFormData({});

        if (activeTab === 'auditLog') {
            fetchAuditLogs(auditEventFilter);
        }

        let interval: ReturnType<typeof setInterval>;
        if (activeTab === 'staff') {
            fetchSessions();
            interval = setInterval(() => {
                fetchData();
                fetchSessions();
            }, 30000);
        }

        return () => { if (interval) clearInterval(interval); };
    }, [activeTab, fetchData, fetchAuditLogs, fetchSessions, auditEventFilter]);

    const handleSealUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formDataUpload = new FormData();
        formDataUpload.append('seal', file);
        setUploadingSeal(true);
        setError(null);
        try {
            const res = await api.post('/departments/upload-seal', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, sealPath: res.data.sealPath }));
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setUploadingSeal(false);
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => { setFormData({ ...formData, photoData: reader.result }); };
            reader.readAsDataURL(file);
        }
    };

    const handleRevokeSession = async (id: string) => {
        if (!window.confirm('Are you sure you want to revoke this session?')) return;
        try {
            await api.delete(`/auth/sessions/${id}`);
            fetchSessions();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const method = editingItem ? 'PUT' : 'POST';
        const endpoint = getEndpoint(activeTab);
        const id = editingItem.id || editingItem.code;
        const url = editingItem ? `${endpoint}/${id}` : endpoint;
        try {
            await api({ url, method, data: formData });
            setShowForm(false);
            setEditingItem(null);
            fetchData();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this master entry?')) return;
        try {
        const targetId = activeTab === 'units' ? id : id; // just keeping it clean, but 'id' passed will be the correct code/id from the row
        await api.delete(`${getEndpoint(activeTab)}/${id}`);
            fetchData();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transferItem || !transferData.branchId) return;
        try {
            await api.post(`/users/${transferItem.id}/transfer`, transferData);
            setShowTransferModal(false);
            setTransferItem(null);
            setTransferData({ branchId: '', designationId: '', remarks: '' });
            fetchData();
            alert('User transferred successfully');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handlePurge = async () => {
        const label = getSingularLabel(activeTab);
        if (!window.confirm(`WARNING: This will permanently delete all isolated ${activeTab} records. Continue?`)) return;
        if (window.prompt(`Type 'PURGE' to confirm deletion of all ${activeTab}`) !== 'PURGE') return;
        
        setLoading(true);
        try {
            const res = await api.delete(`${getEndpoint(activeTab)}/purge`);
            fetchData();
            alert(res.data.message || `Purged ${activeTab}`);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = () => {
        const fileName = `${activeTab === 'staff' ? 'staff' : activeTab === 'units' ? 'units' : activeTab}.csv`;
        const link = document.createElement('a');
        link.href = `/templates/${fileName}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const csvContent = event.target?.result as string;
            setLoading(true);
            try {
                await api.post(`${getEndpoint(activeTab)}/bulk`, { csvContent });
                fetchData();
                alert(`Processed ${activeTab} upload.`);
            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setLoading(false);
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const startEdit = (item: MasterItem) => {
        setError(null);
        const parsedFormData = { ...item };
        if (activeTab === 'units' && typeof item.specialStatus === 'string' && item.specialStatus) {
            try { parsedFormData.specialStatus = JSON.parse(item.specialStatus); } catch { parsedFormData.specialStatus = []; }
        }
        setEditingItem(item);
        setFormData({
            ...parsedFormData,
            departmentIds: item.departments?.map(d => d.id!) || (item.departmentId ? [item.departmentId] : []),
            managedDepartmentIds: item.managedDepartments?.map(d => d.id!) || [],
            isUnitHead: item.branch?.headUserId === item.id,
            isSecondLine: item.isSecondLine || item.branch?.secondLineUserId === item.id
        });
        setShowForm(true);
    };

    const renderForm = () => {
        const commonProps = { formData, setFormData };
        switch (activeTab) {
            case 'departments': return <DepartmentForm {...commonProps} handleSealUpload={handleSealUpload} uploadingSeal={uploadingSeal} />;
            case 'designations': return <DesignationForm {...commonProps} />;
            case 'units': return <UnitForm {...commonProps} handleSpecialStatusChange={(status) => {
                const current = Array.isArray(formData.specialStatus) ? formData.specialStatus : [];
                setFormData({ ...formData, specialStatus: current.includes(status) ? current.filter(s => s !== status) : [...current, status] });
            }} />;
            case 'staff': return <StaffForm {...commonProps} editingItem={editingItem} designations={designations} branches={branches} departments={departments} handlePhotoUpload={handlePhotoUpload} />;
            case 'atms': return <ATMForm {...commonProps} branches={branches} />;
            case 'partners': return <PartnerForm {...commonProps} branches={branches} />;
            case 'assets': return <AssetForm {...commonProps} branches={branches} />;
            case 'lockers': return <LockerForm {...commonProps} branches={branches} />;
            default: return null;
        }
    };

    return (
        <div className="flex h-[calc(100vh-12rem)] bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in duration-700">
            <aside className="w-80 bg-gray-50/50 border-r border-gray-100 flex flex-col shrink-0">
                <div className="p-6 h-full flex flex-col overflow-hidden">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" placeholder="Search settings..." className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-bank-navy/10 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <nav className="mt-6 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                        {filteredGroups.map(group => (
                            <div key={group.name} className="space-y-3">
                                <h3 className="px-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] opacity-70">{group.name}</h3>
                                {group.tabs.map(tab => (
                                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-bold transition-all border border-transparent", activeTab === tab.id ? "bg-white text-bank-navy shadow-sm border-gray-100 ring-1 ring-black/5" : "text-gray-500 hover:bg-gray-100 hover:text-bank-navy")}>
                                        <tab.icon size={18} className={activeTab === tab.id ? "text-bank-navy" : "text-gray-400"} />
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </nav>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 bg-white">
                <header className="p-6 border-b border-gray-50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <h1 className="text-xl font-black text-bank-navy uppercase tracking-tight leading-none">Administration</h1>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">System Control & Master Data</p>
                        </div>
                        {dbHealth && (
                            <div className={cn(
                                "px-2 py-1 rounded border flex items-center gap-1.5",
                                dbHealth.status === 'connected' ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"
                            )}>
                                <div className={cn("w-1.5 h-1.5 rounded-full", dbHealth.status === 'connected' ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                                <span className="text-[9px] font-black uppercase tracking-wider">
                                    {dbHealth.status === 'connected' ? `DB Connected (${dbHealth.count} Units)` : 'DB Disconnected'}
                                </span>
                            </div>
                        )}
                    </div>
                    {!showForm && !['misUpload', 'command', 'auditLog', 'organization'].includes(activeTab) && (
                        <div className="flex items-center gap-3">
                            {(['units', 'staff', 'atms', 'departments', 'designations'] as Tab[]).includes(activeTab) && (
                                <button onClick={handlePurge} className="btn-danger">
                                    <Trash2 size={16} />
                                    <span>Purge</span>
                                </button>
                            )}
                            <button onClick={handleDownloadTemplate} className="btn-outline">
                                <Plus size={18} className="rotate-45" />
                                <span>Get Template</span>
                            </button>
                            <input type="file" id="csv-upload" className="hidden" accept=".csv" onChange={handleBulkUpload} />
                            <button onClick={() => document.getElementById('csv-upload')?.click()} className="btn-secondary">
                                <Upload size={18} />
                                <span>Bulk Import</span>
                            </button>
                            <button 
                                onClick={() => { 
                                    setShowForm(true); 
                                    setEditingItem(null); 
                                    setFormData(activeTab === 'units' ? { type: 'BRANCH', populationGroup: 'URBAN', riskCategory: 'MEDIUM' } : activeTab === 'staff' ? { gender: 'M' } : {}); 
                                }} 
                                className="btn-primary"
                            >
                                <Plus size={18} />
                                <span>Add {getSingularLabel(activeTab)}</span>
                            </button>
                        </div>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeTab === 'bulletins' && <NoticeManager />}
                    {activeTab === 'command' && <CommandCenter />}
                    {activeTab === 'misUpload' && <MISUpload />}
                    {activeTab === 'budgets' && <BudgetUpload />}
                    {activeTab === 'registry' && <ParameterManager />}
                    {activeTab === 'organization' && <OrganizationSettings />}
                    {activeTab === 'auditLog' && <AuditLogView auditLogs={auditLogs} auditLogsTotal={auditLogsTotal} auditEventFilter={auditEventFilter} onFilterChange={setAuditEventFilter} />}
                    {(['departments', 'units', 'designations', 'staff', 'atms'] as Tab[]).includes(activeTab) && (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest">Identified Entity</th>
                                        {activeTab === 'units' && <th className="px-6 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest">Global Classification</th>}
                                        <th className="px-6 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest">Regional Nomenclature</th>
                                        <th className="px-6 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {error ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center">
                                                <div className="inline-flex flex-col items-center gap-3">
                                                    <div className="p-3 bg-red-50 text-red-500 rounded-full">
                                                        <X size={24} />
                                                    </div>
                                                    <div className="text-red-700 font-bold">Failed to synchronize data</div>
                                                    <p className="text-sm text-red-500 max-w-md">{error}</p>
                                                    <button onClick={fetchData} className="mt-4 px-6 py-2 bg-bank-navy text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-xl active:scale-95 transition-all">
                                                        Retry Connection
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : loading ? (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-300 font-medium italic">Synchronizing...</td></tr>
                                    ) : data.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-300 font-medium italic">No data entries.</td></tr>
                                    ) : (
                                        activeTab === 'staff' ? (
                                            Object.keys(data.reduce((acc: any, item) => {
                                                const branch = item.branch?.nameEn || 'Unassigned / RO';
                                                if (!acc[branch]) acc[branch] = [];
                                                acc[branch].push(item);
                                                return acc;
                                            }, {})).sort().flatMap(branchName => {
                                                const branchStaff = data.filter(item => (item.branch?.nameEn || 'Unassigned / RO') === branchName).sort((a,b) => (a.grade || '').localeCompare(b.grade || '') || (a.fullNameEn || '').localeCompare(b.fullNameEn || ''));
                                                return [
                                                    <tr key={`header-${branchName}`} className="bg-gray-50/30"><td colSpan={6} className="px-6 py-2.5 text-[11px] font-black text-bank-navy/60 uppercase tracking-[0.2em] border-y border-gray-50"><div className="flex items-center gap-2"><Building2 size={12} className="text-bank-teal" /><span>{branchName}</span><span className="ml-auto bg-white px-2 py-0.5 rounded-full border border-gray-100 shadow-sm">{branchStaff.length} personnel</span></div></td></tr>,
                                                    ...branchStaff.map(item => {
                                                        const activeSession = sessions.find(s => s.userId === item.id);
                                                        return (
                                                            <tr key={item.id} className={cn("hover:bg-bank-navy/[0.02] transition-colors group", activeSession && "bg-green-50/30")}>
                                                                <td className="px-6 py-4"><div className="flex items-center space-x-4"><div className="relative shrink-0">{item.photo?.data ? <img src={item.photo.data as string} className="w-11 h-11 rounded-2xl object-cover shadow-md" alt="" /> : <div className="w-11 h-11 bg-bank-navy/5 text-bank-navy rounded-2xl flex items-center justify-center shadow-inner"><Users size={20} /></div>}{activeSession && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white shadow-sm animate-pulse" />}</div><div><div className="flex items-center gap-2"><span className="font-black text-bank-navy tracking-tight">{item.username}</span>{item.branch?.headUserId === item.id && <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-bank-gold text-bank-navy uppercase tracking-tighter">Chief</span>}</div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">{item.designation?.nameEn || 'N/A'} • {item.grade || '---'}</p></div></div></td>
                                                                <td className="px-6 py-4"><span className="text-sm font-bold text-gray-700">{item.fullNameEn}</span><div className="flex gap-4 mt-1 opacity-60"><span className="text-xs font-tamil">{item.fullNameTa || '-'}</span><span className="text-xs font-hindi">{item.fullNameHi || '-'}</span></div></td>
                                                                <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1">{activeSession && <button onClick={() => handleRevokeSession(activeSession.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"><LogOut size={16} /></button>}<button onClick={() => startEdit(item)} className="p-2 text-bank-teal hover:bg-bank-teal/5 rounded-xl transition-all"><Edit2 size={16} /></button><button onClick={() => { setTransferItem(item); setShowTransferModal(true); }} className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"><ArrowRightLeft size={16} /></button><button onClick={() => handleDelete(item.id || '')} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button></div></td>
                                                            </tr>
                                                        );
                                                    })
                                                ];
                                            })
                                        ) : (
                                                data.map(item => {
                                                const itemId = activeTab === 'units' ? item.code : item.id;
                                                return (
                                                    <tr key={itemId} className="hover:bg-bank-navy/[0.02] transition-colors group">
                                                        <td className="px-6 py-4"><div className="flex items-center space-x-4"><div className="p-2.5 bg-gray-50 text-bank-navy rounded-2xl shadow-inner group-hover:bg-white group-hover:shadow-md transition-all">{activeTab === 'departments' ? <Hash size={18} /> : activeTab === 'units' ? <Building2 size={18} /> : activeTab === 'designations' ? <Briefcase size={18} /> : <Calculator size={18} />}</div><div><p className="font-black text-bank-navy tracking-tight uppercase leading-none">{item.code || item.atmId || item.registrationNo || item.assetCode || item.lockerNo}</p>{activeTab === 'units' && <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1 block">{item.type}</span>}{activeTab === 'atms' && <div className="flex gap-1 mt-1"><span className="text-[9px] font-black bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-widest">{item.deviceType || 'ATM'}</span><span className="text-[9px] font-black bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded uppercase tracking-widest">{item.managementType?.replace('_', ' ') || 'BRANCH MANAGED'}</span></div>}{activeTab === 'partners' && <div className="flex gap-1 mt-1"><span className="text-[9px] font-black bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded uppercase tracking-widest">{item.type?.replace('_', ' ')}</span></div>}{activeTab === 'assets' && <div className="flex gap-1 mt-1"><span className="text-[9px] font-black bg-bank-teal/10 text-bank-teal px-1.5 py-0.5 rounded uppercase tracking-widest">{item.category}</span></div>}{activeTab === 'lockers' && <div className="flex gap-1 mt-1"><span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest", item.status === 'AVAILABLE' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700')}>{item.status?.replace('_', ' ')}</span><span className="text-[9px] font-black bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-widest">{item.type}</span></div>}</div></div></td>
                                                        {activeTab === 'units' && <td className="px-6 py-4"><div className="flex flex-wrap gap-1.5"><span className="px-2 py-0.5 text-[9px] font-black bg-blue-50 text-blue-700 rounded border border-blue-100 uppercase tracking-wider">{item.populationGroup?.replace('_', ' ')}</span><span className={cn("px-2 py-0.5 text-[9px] font-black rounded border uppercase tracking-wider", item.riskCategory === 'HIGH' ? 'bg-red-50 text-red-700 border-red-100' : item.riskCategory === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 'bg-green-50 text-green-700 border-green-100')}>{item.riskCategory} Risk</span></div></td>}
                                                        <td className="px-6 py-4"><p className="text-sm font-bold text-gray-700">{item.nameEn || item.description}</p><div className="flex gap-4 mt-1 opacity-60"><span className="text-xs font-tamil italic">{item.nameTa || '-'}</span><span className="text-xs font-hindi italic">{item.nameHi || '-'}</span></div></td>
                                                        <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => startEdit(item)} className="p-2 text-bank-teal hover:bg-bank-teal/5 rounded-xl transition-all"><Edit2 size={16} /></button><button onClick={() => handleDelete(itemId || '')} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button></div></td>
                                                    </tr>
                                                );
                                            })
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {showForm && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-bank-teal/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 relative">
                        <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 pb-4 border-b border-gray-100">
                            <h3 className="text-2xl font-black text-bank-navy uppercase tracking-tight">{editingItem ? 'Edit' : 'Create'} {getSingularLabel(activeTab)}</h3>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-red-500"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-6">
                            {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 font-bold mb-4">{error}</div>}
                            {renderForm()}
                            <div className="flex justify-end pt-6 mt-6 border-t border-gray-100 gap-3">
                                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary !bg-gray-50 border-none shadow-none">Cancel</button>
                                <button type="submit" className="btn-primary px-10"><Save size={18} /><span>Save Changes</span></button>
                            </div>
                        </form>
                    </div>
                </div>, document.body
            )}

            <TransferModal show={showTransferModal} onClose={() => setShowTransferModal(false)} transferItem={transferItem} transferData={transferData} setTransferData={setTransferData} handleTransfer={handleTransfer} branches={branches} designations={designations} />
        </div>
    );
};

export default SettingsManager;
