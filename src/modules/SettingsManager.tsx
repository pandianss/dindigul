import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { formatLocalISO, parseLocalISO } from '../utils/dateUtils';
import MISUpload from './admin/MISUpload';
import BudgetUpload from './admin/BudgetUpload';
import ParameterManager from './admin/ParameterManager';
import NoticeManager from './admin/NoticeManager';
import CommandCenter from './admin/CommandCenter';
import OrganizationSettings from './admin/OrganizationSettings';
import { getErrorMessage } from '../utils/handleError';
import { cn } from '../utils/cn';
import {
    Settings,
    Building2,
    Users,
    Briefcase,
    Plus,
    Save,
    Trash2,
    Edit2,
    X,
    Hash,
    Upload,
    ArrowRightLeft,
    Megaphone,
    Award,
    ShieldCheck,
    Calculator,
    Filter,
    IndianRupee,
    Command as CommandCenterIcon,
    LogOut
} from 'lucide-react';

type Tab = 'departments' | 'units' | 'designations' | 'staff' | 'atms' | 'bulletins' | 'misUpload' | 'budgets' | 'registry' | 'auditLog' | 'command' | 'organization';

interface MasterItem {
    id?: string;
    nameEn?: string;
    fullNameEn?: string;
    nameTa?: string;
    fullNameTa?: string;
    nameHi?: string;
    fullNameHi?: string;
    designationEn?: string;
    designationTa?: string;
    designationHi?: string;
    code?: string;
    username?: string;
    type?: string;
    openDate?: string;
    populationGroup?: string;
    address?: string;
    addressTa?: string;
    addressHi?: string;
    phone?: string;
    email?: string;
    riskCategory?: string;
    riskEffectiveDate?: string;
    specialStatus?: string | string[];
    gender?: string;
    officeId?: number;
    workId?: number;
    role?: string;
    grade?: string;
    designationId?: string;
    branchId?: string;
    sealPath?: string;
    departmentId?: string;
    departmentIds?: string[];
    managedDepartmentIds?: string[];
    isUnitHead?: boolean;
    isSecondLine?: boolean;
    designation?: { nameEn: string };
    branch?: { nameEn: string, headUserId?: string, secondLineUserId?: string, type?: string };
    department?: { nameEn: string };
    departments?: { id: string, nameEn: string }[];
    managedDepartments?: { id: string, nameEn: string }[];
    photo?: { data: string };
    photoData?: string | ArrayBuffer | null;
    atmId?: string;
    lastTxnTime?: string;
    balance?: number;
    size?: string;
}


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

    const tabGroups = [
        {
            name: 'Organizational Masters',
            icon: Building2,
            tabs: [
                { id: 'departments', label: 'Departments', icon: Hash },
                { id: 'units', label: 'Units', icon: Building2 },
                { id: 'designations', label: 'Designations', icon: Briefcase },
                { id: 'staff', label: 'Staff', icon: Users },
                { id: 'atms', label: 'ATMs', icon: Calculator }
            ]
        },
        {
            name: 'Data & Logistics',
            icon: Upload,
            tabs: [
                { id: 'misUpload', label: 'MIS File Drops', icon: Upload },
                { id: 'budgets', label: 'Budget', icon: IndianRupee },
                { id: 'registry', label: 'In/Out Registry', icon: Hash },
                { id: 'bulletins', label: 'Bulletins', icon: Megaphone }
            ]
        },
        {
            name: 'System & Security',
            icon: Settings,
            tabs: [
                { id: 'organization', label: 'Organization', icon: Building2 },
                { id: 'command', label: 'Command Center', icon: CommandCenterIcon },
                { id: 'auditLog', label: 'Auth Audit Log', icon: ShieldCheck }
            ]
        }
    ];

    const filteredGroups = tabGroups.map(group => ({
        ...group,
        tabs: group.tabs.filter(tab => 
            tab.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
            tab.id.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(group => group.tabs.length > 0);

    // Form States
    const [formData, setFormData] = useState<MasterItem>({});
    const [designations, setDesignations] = useState<MasterItem[]>([]);
    const [branches, setBranches] = useState<MasterItem[]>([]);
    const [departments, setDepartments] = useState<MasterItem[]>([]);
    const [uploadingSeal, setUploadingSeal] = useState(false);

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
        } catch (err: any) {
            setError(getErrorMessage(err));
        } finally {
            setUploadingSeal(false);
        }
    };

    const getSingularLabel = (tab: Tab) => {
        const labels: Record<string, string> = {
            departments: 'Department',
            units: 'Unit',
            designations: 'Designation',
            staff: 'Staff Member',
            atms: 'ATM',
            bulletins: 'Bulletin',
            misUpload: 'MIS File',
            budgets: 'Budget Item',
            registry: 'Registry Entry',
            command: 'Command',
            auditLog: 'Audit Log'
        };
        return labels[tab] || tab;
    };

    const getEndpoint = (tab: Tab) => {
        if (tab === 'units') return '/branches';
        if (tab === 'staff') return '/users';
        if (tab === 'atms') return '/atms';
        return `/${tab}`;
    };

    const fetchData = async () => {
        if (activeTab === 'misUpload' || activeTab === 'budgets' || activeTab === 'registry' || activeTab === 'bulletins' || activeTab === 'command') return;
        setLoading(true);
        setError(null);
        try {
            const endpoint = getEndpoint(activeTab);
            const query = (activeTab === 'staff' || activeTab === 'atms') ? '?limit=1000' : '';
            const res = await api.get(`${endpoint}${query}`);
            setData(res.data.data || res.data);

            if (activeTab === 'staff' || activeTab === 'atms') {
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
    };

    useEffect(() => {
        setData([]); // Clear old data immediately
        setSessions([]);
        if (activeTab !== 'auditLog') fetchData();
        setShowForm(false);
        setEditingItem(null);
        setFormData({});

        const fetchAuditLogs = async (eventFilter: string = '') => {
            try {
                const params = eventFilter ? `?event=${eventFilter}` : '';
                const res = await api.get(`/auth/audit-log${params}`);
                setAuditLogs(res.data.logs || []);
                setAuditLogsTotal(res.data.total || 0);
            } catch (err) {
                console.error("Failed to fetch audit logs");
            }
        };

        const fetchSessionsForStaff = async () => {
            try {
                const res = await api.get('/auth/sessions');
                setSessions(res.data);
            } catch (err) {
                console.error("Failed to fetch live sessions");
            }
        };

        let interval: ReturnType<typeof setInterval>;
        if (activeTab === 'auditLog') {
            fetchAuditLogs();
        }

        if (activeTab === 'staff') {
            fetchSessionsForStaff(); // Initial fetch
            interval = setInterval(() => {
                fetchData();
                fetchSessionsForStaff();
            }, 30000); // 30 seconds polling
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTab]);

    const formatDuration = (loginTime: string) => {
        const diffInSeconds = Math.floor((Date.now() - new Date(loginTime).getTime()) / 1000);
        const hours = Math.floor(diffInSeconds / 3600);
        const minutes = Math.floor((diffInSeconds % 3600) / 60);

        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m`;
        return `${diffInSeconds}s`;
    };

    const handleRevokeSession = async (id: string) => {
        if (!window.confirm('Are you sure you want to revoke this session? The user will be logged out immediately.')) return;
        try {
            await api.delete(`/auth/sessions/${id}`);
            // Force quick refresh of sessions
            if (activeTab === 'staff') {
                const res = await api.get('/auth/sessions');
                setSessions(res.data);
            }
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const method = editingItem ? 'PUT' : 'POST';
        const endpoint = getEndpoint(activeTab);
        const url = editingItem
            ? `${endpoint}/${editingItem.id}`
            : endpoint;

        try {
            const res = await api({
                url,
                method,
                data: formData
            });
            if (res.status === 200 || res.status === 201) {
                setShowForm(false);
                setEditingItem(null);
                fetchData();
            }
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this master entry?')) return;
        try {
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
            setTransferItem(null);
            setShowTransferModal(false);
            setTransferData({ branchId: '', designationId: '', remarks: '' });
            fetchData();
            alert('User transferred successfully');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handlePurgeUnits = async () => {
        const confirm1 = window.confirm("WARNING: You are about to irrevocably delete ALL units that do not have active constraints (staff, historical records, documents). Are you absolutely sure?");
        if (!confirm1) return;
        const confirm2 = window.prompt("Type 'PURGE' to confirm mass deletion of isolated units.");
        if (confirm2 !== 'PURGE') return;

        setLoading(true);
        try {
            const res = await api.delete('/branches/purge');
            alert(res.data.message || 'Units purged successfully.');
            fetchData();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, photoData: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const csvContent = event.target?.result as string;
            setLoading(true);
            try {
                const endpoint = getEndpoint(activeTab);
                await api.post(`${endpoint}/bulk`, { csvContent });
                fetchData();
                alert(`Successfully processed ${activeTab} upload.`);
            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setLoading(false);
                // Reset file input
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const startEdit = (item: MasterItem) => {
        setError(null);
        const parsedFormData = { ...item };

        // Parse specialStatus if it's a JSON string
        if (activeTab === 'units' && item.specialStatus && typeof item.specialStatus === 'string') {
            try {
                parsedFormData.specialStatus = JSON.parse(item.specialStatus);
            } catch {
                parsedFormData.specialStatus = [];
            }
        }

        setEditingItem(item);

        // Populate arrays for multi-selects
        const initialFormData = {
            ...parsedFormData,
            departmentIds: item.departments?.map(d => d.id) || (item.departmentId ? [item.departmentId] : []),
            managedDepartmentIds: item.managedDepartments?.map(d => d.id) || [],
            isUnitHead: item.branch?.headUserId === item.id,
            isSecondLine: item.isSecondLine || item.branch?.secondLineUserId === item.id
        };

        setFormData(initialFormData);
        setShowForm(true);
    };

    const handleSpecialStatusChange = (status: string) => {
        const currentStatus = Array.isArray(formData.specialStatus) ? formData.specialStatus : [];
        if (currentStatus.includes(status)) {
            setFormData({ ...formData, specialStatus: currentStatus.filter((s: string) => s !== status) });
        } else {
            setFormData({ ...formData, specialStatus: [...currentStatus, status] });
        }
    };

    const renderForm = () => {
        switch (activeTab) {
            // ... (departments, designations cases remain same)
            case 'departments':
                return (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Code</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={formData.code || ''}
                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Name (English)</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={formData.nameEn || ''}
                                onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Name (Tamil) - தமிழ்</label>
                            <input
                                className="w-full p-2 border rounded font-tamil"
                                value={formData.nameTa || ''}
                                onChange={e => setFormData({ ...formData, nameTa: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Name (Hindi) - हिंदी</label>
                            <input
                                className="w-full p-2 border rounded font-hindi"
                                value={formData.nameHi || ''}
                                onChange={e => setFormData({ ...formData, nameHi: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-bank-navy mb-2 uppercase tracking-wider">Departmental Seal (Vector/PNG Support)</label>
                            <div className="flex items-center space-x-4 bg-bank-teal/5 p-4 rounded-xl border border-bank-teal/20">
                                <div className="w-16 h-16 bg-white rounded-lg border flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                                    {formData.sealPath ? (
                                        <img src={`/${formData.sealPath}`} alt="Seal Preview" className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <Building2 className="text-gray-200" size={32} />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <input 
                                        type="file" 
                                        id="seal-upload" 
                                        className="hidden" 
                                        accept=".png,.jpg,.jpeg,.svg"
                                        onChange={handleSealUpload}
                                    />
                                    <label 
                                        htmlFor="seal-upload" 
                                        className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-sm cursor-pointer transition-all ${
                                            uploadingSeal ? 'bg-gray-100 text-gray-400' : 'bg-bank-teal text-white hover:bg-bank-navy'
                                        }`}
                                    >
                                        <Upload size={16} />
                                        <span>{uploadingSeal ? 'Uploading...' : 'Upload New Seal'}</span>
                                    </label>
                                    <div className="mt-2 flex items-center space-x-2">
                                        <span className="text-[10px] font-mono text-gray-400">Path: {formData.sealPath || 'No seal uploaded'}</span>
                                        {formData.sealPath && (
                                            <button 
                                                onClick={() => setFormData({ ...formData, sealPath: '' })}
                                                className="text-red-400 hover:text-red-600 p-1"
                                                title="Remove Seal"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 italic flex items-center">
                                <Plus size={10} className="mr-1" /> Best results with SVG or transparent PNG.
                            </p>
                        </div>
                    </div>
                );
            case 'designations':
                return (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Code</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={formData.code || ''}
                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Work ID (Sorting)</label>
                            <input
                                type="number"
                                className="w-full p-2 border rounded"
                                value={formData.workId || ''}
                                onChange={e => setFormData({ ...formData, workId: parseInt(e.target.value) || 0 })}
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Title (English)</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={formData.nameEn || ''}
                                onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Title (Tamil) - தமிழ்</label>
                            <input
                                className="w-full p-2 border rounded font-tamil"
                                value={formData.nameTa || ''}
                                onChange={e => setFormData({ ...formData, nameTa: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Title (Hindi) - हिंदी</label>
                            <input
                                className="w-full p-2 border rounded font-hindi"
                                value={formData.nameHi || ''}
                                onChange={e => setFormData({ ...formData, nameHi: e.target.value })}
                            />
                        </div>
                    </div>
                );
            case 'units': {
                const isRO = formData.type === 'RO' || formData.type === 'Regional Office';
                return (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Unit Code</label>
                            <input
                                className="w-full p-2 border rounded font-bold"
                                value={formData.code || ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    const nextData = { ...formData, code: val };
                                    // Auto-sync sorting ID if it hasn't been manually set differently
                                    if (!formData.officeId || formData.officeId === 9999 || formData.officeId === 0) {
                                        nextData.officeId = parseInt(val) || 0;
                                    }
                                    setFormData(nextData);
                                }}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Office ID (Sorting)</label>
                            <input
                                type="number"
                                className="w-full p-2 border rounded"
                                value={formData.officeId || ''}
                                onChange={e => setFormData({ ...formData, officeId: parseInt(e.target.value) || 0 })}
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Unit Open Date</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded"
                                value={formData.openDate || ''}
                                onChange={e => setFormData({ ...formData, openDate: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Unit Name (English)</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={formData.nameEn || ''}
                                onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                                required
                            />
                        </div>

                        {/* Unit Type & Population Group */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider text-bank-navy">Unit Type</label>
                            <select
                                className="w-full p-2 border rounded"
                                value={formData.type || 'BRANCH'}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="RO">Regional Office</option>
                                <option value="LPC">Loan Processing Centre</option>
                                <option value="BRANCH">Branch</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider text-bank-navy">Branch Size (Budgeting)</label>
                            <select
                                className="w-full p-2 border rounded font-bold text-indigo-700 bg-indigo-50/30"
                                value={formData.size || ''}
                                onChange={e => setFormData({ ...formData, size: e.target.value })}
                            >
                                <option value="">Not Categorized</option>
                                <option value="Small">Small</option>
                                <option value="Medium">Medium</option>
                                <option value="Large">Large</option>
                                <option value="Very Large">Very Large</option>
                                <option value="Extra Large">Extra Large</option>
                            </select>
                        </div>
                        {!isRO && (
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider text-bank-navy">Population Group</label>
                                <select
                                    className="w-full p-2 border rounded"
                                    value={formData.populationGroup || 'URBAN'}
                                    onChange={e => setFormData({ ...formData, populationGroup: e.target.value })}
                                >
                                    <option value="METRO">Metro</option>
                                    <option value="URBAN">Urban</option>
                                    <option value="SEMI_URBAN">Semi-Urban</option>
                                    <option value="RURAL">Rural</option>
                                </select>
                            </div>
                        )}

                        {/* Special Status */}
                        {!isRO && (
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider text-bank-navy">Special Status</label>
                                <div className="flex flex-wrap gap-3">
                                    {['MSME', 'Agri', 'Retail', 'Captive', 'Specialised Retail', 'Forex', 'Large Corporate'].map(status => (
                                        <label key={status} className="flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-md border border-gray-200 cursor-pointer hover:bg-gray-100">
                                            <input
                                                type="checkbox"
                                                checked={(formData.specialStatus || []).includes(status)}
                                                onChange={() => handleSpecialStatusChange(status)}
                                                className="rounded text-bank-navy focus:ring-bank-navy"
                                            />
                                            <span className="text-sm font-medium text-gray-700">{status}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Risk Categorization */}
                        {!isRO && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider text-bank-navy">Risk Category</label>
                                    <select
                                        className="w-full p-2 border rounded font-bold text-gray-700"
                                        value={formData.riskCategory || 'MEDIUM'}
                                        onChange={e => setFormData({ ...formData, riskCategory: e.target.value })}
                                    >
                                        <option value="LOW">Low Risk</option>
                                        <option value="MEDIUM">Medium Risk</option>
                                        <option value="HIGH">High Risk</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider text-bank-navy">Risk Effective Date</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            className="w-full p-2 border rounded"
                                            value={formData.riskEffectiveDate?.toString().split('T')[0] || ''}
                                            onChange={e => setFormData({ ...formData, riskEffectiveDate: e.target.value || undefined })}
                                        />
                                    </div>
                                </div>

                            </>
                        )}

                        <div className="col-span-2 mt-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Unit Name (Tamil) - தமிழ்</label>
                                    <input
                                        className="w-full p-2 border rounded font-tamil"
                                        value={formData.nameTa || ''}
                                        onChange={e => setFormData({ ...formData, nameTa: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Unit Name (Hindi) - हिंदी</label>
                                    <input
                                        className="w-full p-2 border rounded font-hindi"
                                        value={formData.nameHi || ''}
                                        onChange={e => setFormData({ ...formData, nameHi: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider text-bank-navy">Address (English)</label>
                            <textarea
                                className="w-full p-2 border rounded"
                                value={formData.address || ''}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider text-bank-navy">Address (Tamil) - தமிழ்</label>
                            <textarea
                                className="w-full p-2 border rounded font-tamil"
                                value={formData.addressTa || ''}
                                onChange={e => setFormData({ ...formData, addressTa: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider text-bank-navy">Address (Hindi) - हिंदी</label>
                            <textarea
                                className="w-full p-2 border rounded font-hindi"
                                value={formData.addressHi || ''}
                                onChange={e => setFormData({ ...formData, addressHi: e.target.value })}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider text-bank-navy">Phone</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider text-bank-navy">Email</label>
                            <input
                                className="w-full p-2 border rounded"
                                type="email"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>
                );
            }
            case 'staff':
                return (
                    <div className="grid grid-cols-2 gap-4">
                        {/* ... (staff form implementation remains same) */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Username / ID</label>
                            <input
                                className="w-full p-2 border rounded bg-gray-50"
                                value={formData.username || ''}
                                readOnly={!!editingItem}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Staff Photo (Portrait 4:5)</label>
                            <div className="flex items-center space-x-4">
                                <div className="w-24 h-30 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
                                    {formData.photoData || (editingItem?.photo?.data) ? (
                                        <img
                                            src={(formData.photoData as string) || editingItem?.photo?.data}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Users className="text-gray-300" size={32} />
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoUpload}
                                    className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-bank-navy/10 file:text-bank-navy hover:file:bg-bank-navy/20 cursor-pointer"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Full Name (English)</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={formData.fullNameEn || ''}
                                onChange={e => setFormData({ ...formData, fullNameEn: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Designation Override (English)</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={formData.designationEn || ''}
                                onChange={e => setFormData({ ...formData, designationEn: e.target.value })}
                                placeholder="e.g. Senior Regional Manager"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Gender</label>
                            <select
                                className="w-full p-2 border rounded"
                                value={formData.gender || 'M'}
                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                            >
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                            </select>
                        </div>

                        {/* Organizational Details */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Designation</label>
                            <select
                                className="w-full p-2 border rounded"
                                value={formData.designationId || ''}
                                onChange={e => setFormData({ ...formData, designationId: e.target.value })}
                            >
                                <option value="">Select Designation</option>
                                {designations.map(d => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Grade</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={formData.grade || ''}
                                onChange={e => setFormData({ ...formData, grade: e.target.value })}
                                placeholder="e.g. SCALE-I, CLERK"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Branch / Unit</label>
                            <select
                                className="w-full p-2 border rounded"
                                value={formData.branchId || ''}
                                onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                            >
                                <option value="">Select Branch</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.code} - {b.nameEn}</option>)}
                            </select>
                        </div>
                        {['RO_USER', 'ADMIN'].includes(formData.role || '') && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Department</label>
                                <select
                                    className="w-full p-2 border rounded"
                                    value={formData.departmentId || ''}
                                    onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">System Role</label>
                            <select
                                className="w-full p-2 border rounded"
                                value={formData.role || 'BRANCH_USER'}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="ADMIN">System Admin</option>
                                <option value="RO_USER">Regional Office User</option>
                                <option value="BRANCH_USER">Branch User</option>
                                <option value="LPC_USER">Loan Processing Centre User</option>
                            </select>
                        </div>

                        {/* Hierarchy Controls */}
                        <div className="col-span-2 space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-bank-navy uppercase tracking-wider">Hierarchy & Leadership</h4>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded text-bank-teal"
                                        checked={formData.isUnitHead || false}
                                        onChange={e => setFormData({ ...formData, isUnitHead: e.target.checked })}
                                    />
                                    <span className="text-sm font-bold text-gray-700">Set as Head of Unit</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded text-bank-teal"
                                        checked={formData.isSecondLine || false}
                                        onChange={e => setFormData({ ...formData, isSecondLine: e.target.checked })}
                                    />
                                    <span className="text-sm font-bold text-gray-700">Set as 2nd Line</span>
                                </label>
                            </div>

                            {['RO_USER', 'ADMIN'].includes(formData.role || '') && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">Assigned Departments</label>
                                        <div className="max-h-32 overflow-y-auto border rounded bg-white p-2">
                                            {departments.map(d => (
                                                <label key={`dept-${d.id}`} className="flex items-center space-x-2 mb-1 cursor-pointer hover:bg-gray-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.departmentIds || []).includes(d.id!)}
                                                        onChange={e => {
                                                            const current = formData.departmentIds || [];
                                                            if (e.target.checked) setFormData({ ...formData, departmentIds: [...current, d.id!] });
                                                            else setFormData({ ...formData, departmentIds: current.filter(id => id !== d.id) });
                                                        }}
                                                    />
                                                    <span className="text-xs">{d.nameEn}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">Headed Departments</label>
                                        <div className="max-h-32 overflow-y-auto border rounded bg-white p-2">
                                            {departments.map(d => (
                                                <label key={`headed-${d.id}`} className="flex items-center space-x-2 mb-1 cursor-pointer hover:bg-gray-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.managedDepartmentIds || []).includes(d.id!)}
                                                        onChange={e => {
                                                            const current = formData.managedDepartmentIds || [];
                                                            if (e.target.checked) setFormData({ ...formData, managedDepartmentIds: [...current, d.id!] });
                                                            else setFormData({ ...formData, managedDepartmentIds: current.filter(id => id !== d.id) });
                                                        }}
                                                    />
                                                    <span className="text-xs font-bold text-bank-teal">{d.nameEn}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Full Name (Tamil) - தமிழ்</label>
                            <input
                                className="w-full p-2 border rounded font-tamil"
                                value={formData.fullNameTa || ''}
                                onChange={e => setFormData({ ...formData, fullNameTa: e.target.value })}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Designation (Tamil) - தமிழ்</label>
                            <input
                                className="w-full p-2 border rounded font-tamil"
                                value={formData.designationTa || ''}
                                onChange={e => setFormData({ ...formData, designationTa: e.target.value })}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Full Name (Hindi) - हिंदी</label>
                            <input
                                className="w-full p-2 border rounded font-hindi"
                                value={formData.fullNameHi || ''}
                                onChange={e => setFormData({ ...formData, fullNameHi: e.target.value })}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Designation (Hindi) - हिंदी</label>
                            <input
                                className="w-full p-2 border rounded font-hindi"
                                value={formData.designationHi || ''}
                                onChange={e => setFormData({ ...formData, designationHi: e.target.value })}
                            />
                        </div>
                    </div>
                );
            case 'atms':
                return (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">ATM ID (Unique)</label>
                            <input
                                className="w-full p-2 border rounded font-mono"
                                value={formData.atmId || ''}
                                onChange={e => setFormData({ ...formData, atmId: e.target.value })}
                                required
                                placeholder="e.g. S1AC00123"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Branch Assignment</label>
                            <select
                                className="w-full p-2 border rounded"
                                value={formData.branchId || ''}
                                onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                                required
                            >
                                <option value="">Select Branch</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.code} - {b.nameEn}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Current Balance (₹)</label>
                            <input
                                type="number"
                                className="w-full p-2 border rounded"
                                value={formData.balance || 0}
                                onChange={e => setFormData({ ...formData, balance: parseFloat(e.target.value) })}
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Last Transaction Time</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={formData.lastTxnTime || ''}
                                onChange={e => setFormData({ ...formData, lastTxnTime: e.target.value })}
                                placeholder="e.g. 22-02-2026 14:30"
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex h-[calc(100vh-12rem)] bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in duration-700">
            {/* Inner Settings Sidebar */}
            <aside className="w-80 bg-gray-50/50 border-r border-gray-100 flex flex-col shrink-0">
                <div className="p-6 h-full flex flex-col overflow-hidden">
                    <div className="space-y-6 flex flex-col h-full">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search settings..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-bank-navy/10 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <nav className="mt-6 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                        {filteredGroups.map(group => (
                            <div key={group.name} className="space-y-3">
                                <h3 className="px-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] opacity-70">
                                    {group.name}
                                </h3>
                                <div className="space-y-1">
                                    {group.tabs.map(tab => {
                                        const Icon = tab.icon;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as Tab)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-bold transition-all border border-transparent",
                                                    activeTab === tab.id 
                                                        ? "bg-white text-bank-navy shadow-sm border-gray-100 ring-1 ring-black/5" 
                                                        : "text-gray-500 hover:bg-gray-100 hover:text-bank-navy"
                                                )}
                                            >
                                                <Icon size={18} className={cn(activeTab === tab.id ? "text-bank-navy" : "text-gray-400")} />
                                                <span>{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>
                </div>
            </div>
        </aside>

            {/* Content Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-white">
                <header className="p-6 border-b border-gray-50 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-bank-navy uppercase tracking-tight flex items-center gap-3">
                            {(() => {
                                const allTabs = tabGroups.flatMap(g => g.tabs);
                                const current = allTabs.find(t => t.id === activeTab);
                                const Icon = current?.icon || Settings;
                                return (
                                    <>
                                        <div className="p-2 bg-bank-navy/5 rounded-xl text-bank-navy">
                                            <Icon size={24} />
                                        </div>
                                        <span>{current?.label || 'Settings'}</span>
                                    </>
                                );
                            })()}
                        </h2>
                        <p className="text-sm text-gray-400 font-medium mt-1">
                            {activeTab === 'staff' ? 'Manage personnel and hierarchies' : 
                             activeTab === 'units' ? 'Configure branches and offices' :
                             'System administration and master data management'}
                        </p>
                    </div>

                    {!showForm && !['misUpload', 'command', 'auditLog', 'organization'].includes(activeTab) && (
                        <div className="flex gap-3">
                            {activeTab === 'units' && (
                                <button
                                    onClick={handlePurgeUnits}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl font-bold border border-red-100 hover:bg-red-100 transition-all text-[11px] uppercase tracking-widest"
                                >
                                    <Trash2 size={16} />
                                    Purge Units
                                </button>
                            )}
                            <input type="file" id="csv-upload" className="hidden" accept=".csv" onChange={handleBulkUpload} />
                            <button
                                onClick={() => document.getElementById('csv-upload')?.click()}
                                className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all text-[11px]"
                            >
                                <Upload size={18} />
                                Bulk Import (CSV)
                            </button>
                            <button
                                onClick={() => {
                                    const defaults: MasterItem = {};
                                    if (activeTab === 'units') {
                                        defaults.type = 'BRANCH';
                                        defaults.populationGroup = 'URBAN';
                                        defaults.riskCategory = 'MEDIUM';
                                    } else if (activeTab === 'staff') {
                                        defaults.gender = 'M';
                                    }
                                    setFormData(defaults);
                                    setEditingItem(null);
                                    setShowForm(true);
                                }}
                                className="flex items-center gap-2 px-5 py-1.5 bg-bank-navy text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md text-[11px]"
                            >
                                <Plus size={18} />
                                Add {getSingularLabel(activeTab)}
                            </button>
                        </div>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="animate-in fade-in duration-500">
                        {activeTab === 'bulletins' && <NoticeManager />}
                        {activeTab === 'command' && <CommandCenter />}
                        {activeTab === 'misUpload' && <MISUpload />}
                        {activeTab === 'budgets' && <BudgetUpload />}
                        {activeTab === 'registry' && <ParameterManager />}
                        {activeTab === 'organization' && <OrganizationSettings />}
                        
                        {activeTab === 'auditLog' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <select
                                        className="px-4 py-2 border border-gray-200 rounded-xl font-bold text-bank-navy shadow-sm outline-none focus:ring-2 focus:ring-bank-navy/10 transition-all text-sm"
                                        value={auditEventFilter}
                                        onChange={(e) => {
                                            setAuditEventFilter(e.target.value);
                                            api.get(`/auth/audit-log${e.target.value ? `?event=${e.target.value}` : ''}`)
                                                .then(res => {
                                                    setAuditLogs(res.data.logs || []);
                                                    setAuditLogsTotal(res.data.total || 0);
                                                })
                                                .catch(console.error);
                                        }}
                                    >
                                        <option value="">All Security Events</option>
                                        <option value="LOGIN_SUCCESS">Login Success</option>
                                        <option value="LOGIN_FAILED">Login Failed</option>
                                        <option value="LOGOUT">Logout</option>
                                        <option value="LOCKOUT">Account Lockout</option>
                                    </select>
                                    <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                        Found {auditLogsTotal} Security Logs
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/50 text-[11px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-100">
                                                <th className="px-4 py-3">Timestamp</th>
                                                <th className="px-4 py-3">User Identity</th>
                                                <th className="px-4 py-3">Event Type</th>
                                                <th className="px-4 py-3">IP Address</th>
                                                <th className="px-4 py-3">Security Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {auditLogs.map((log) => (
                                                <tr key={log.id} className="hover:bg-gray-50 transition-colors text-sm">
                                                    <td className="p-4 whitespace-nowrap text-gray-500 font-mono text-xs">
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </td>
                                                    <td className="p-4 font-bold text-bank-navy">
                                                        {log.username}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={cn(
                                                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                                                            log.event.includes('SUCCESS') ? 'bg-green-100 text-green-700' :
                                                            log.event.includes('FAILED') || log.event.includes('LOCKOUT') ? 'bg-red-100 text-red-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        )}>
                                                            {log.event.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-gray-400 font-mono text-xs">
                                                        {log.ipAddress || '---'}
                                                    </td>
                                                    <td className="p-4 text-xs text-gray-400 max-w-xs truncate italic">
                                                        {log.metadata ? JSON.parse(log.metadata).reason || log.metadata : 'No metadata'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {(['departments', 'units', 'designations', 'staff', 'atms'] as Tab[]).includes(activeTab) && (
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-6 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest">Identified Entity</th>
                                            {activeTab === 'units' && <th className="px-6 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest">Global Classification</th>}
                                            <th className="px-6 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest">Regional Nomenclature</th>
                                            <th className="px-6 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Administrative Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loading ? (
                                            <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-300 font-medium italic">Synchronizing with server...</td></tr>
                                        ) : data.length === 0 ? (
                                            <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-300 font-medium italic">No data entries available in this category.</td></tr>
                                        ) : (() => {
                                            if (activeTab === 'staff') {
                                                const grouped: { [key: string]: MasterItem[] } = {};
                                                data.forEach(item => {
                                                    const branchName = item.branch?.nameEn || 'Unassigned / RO';
                                                    if (!grouped[branchName]) grouped[branchName] = [];
                                                    grouped[branchName].push(item);
                                                });
                                                const sortedBranches = Object.keys(grouped).sort();

                                                return sortedBranches.flatMap(branchName => {
                                                    const sortedStaff = grouped[branchName].sort((a, b) => {
                                                        const gradeCompare = (a.grade || '').localeCompare(b.grade || '');
                                                        if (gradeCompare !== 0) return gradeCompare;
                                                        return (a.fullNameEn || '').localeCompare(b.fullNameEn || '');
                                                    });

                                                    return [
                                                        <tr key={`header-${branchName}`} className="bg-gray-50/30">
                                                            <td colSpan={6} className="px-6 py-2.5 text-[11px] font-black text-bank-navy/60 uppercase tracking-[0.2em] border-y border-gray-50">
                                                                <div className="flex items-center gap-2">
                                                                    <Building2 size={12} className="text-bank-teal" />
                                                                    <span>{branchName}</span>
                                                                    <span className="ml-auto font-medium lowercase tracking-normal bg-white px-2 py-0.5 rounded-full border border-gray-100 shadow-sm">{sortedStaff.length} personnel</span>
                                                                </div>
                                                            </td>
                                                        </tr>,
                                                        ...sortedStaff.map(item => {
                                                            const activeSession = sessions.find(s => s.userId === item.id);
                                                            return (
                                                                <tr key={item.id} className={cn("hover:bg-bank-navy/[0.02] transition-colors group", activeSession && "bg-green-50/30")}>
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center space-x-4">
                                                                            <div className="relative shrink-0">
                                                                                {item.photo?.data ? (
                                                                                    <img src={item.photo.data as string} alt="" className="w-11 h-11 rounded-2xl object-cover ring-2 ring-white shadow-md" />
                                                                                ) : (
                                                                                    <div className="w-11 h-11 bg-bank-navy/5 text-bank-navy rounded-2xl flex items-center justify-center shadow-inner">
                                                                                        <Users size={20} />
                                                                                    </div>
                                                                                )}
                                                                                {activeSession && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white shadow-sm animate-pulse" />}
                                                                            </div>
                                                                            <div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="font-black text-bank-navy tracking-tight">{item.username}</span>
                                                                                    {item.branch?.headUserId === item.id && (
                                                                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-bank-gold text-bank-navy shadow-sm uppercase tracking-tighter">Chief</span>
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">
                                                                                    {item.designation?.nameEn || 'N/A'} • {item.grade || '---'}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <span className="text-sm font-bold text-gray-700">{item.fullNameEn}</span>
                                                                        <div className="flex gap-4 mt-1 opacity-60">
                                                                            <span className="text-xs font-tamil">{item.fullNameTa || '-'}</span>
                                                                            <span className="text-xs font-hindi">{item.fullNameHi || '-'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <div className="flex items-center justify-end gap-1">
                                                                            {activeSession && (
                                                                                <button onClick={() => handleRevokeSession(activeSession.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Terminate Session"><LogOut size={16} /></button>
                                                                            )}
                                                                            <button onClick={() => startEdit(item)} className="p-2 text-bank-teal hover:bg-bank-teal/5 rounded-xl transition-all"><Edit2 size={16} /></button>
                                                                            <button onClick={() => { setTransferItem(item); setTransferData({ branchId: '', designationId: item.designationId || '', remarks: '' }); setShowTransferModal(true); }} className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"><ArrowRightLeft size={16} /></button>
                                                                            <button onClick={() => handleDelete(item.id || '')} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ];
                                                });
                                            }

                                            return data.map((item) => (
                                                <tr key={item.id} className="hover:bg-bank-navy/[0.02] transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center space-x-4">
                                                            <div className="p-2.5 bg-gray-50 text-bank-navy rounded-2xl shadow-inner group-hover:bg-white group-hover:shadow-md transition-all">
                                                                {activeTab === 'departments' && <Hash size={18} />}
                                                                {activeTab === 'units' && <Building2 size={18} />}
                                                                {activeTab === 'designations' && <Briefcase size={18} />}
                                                                {activeTab === 'atms' && <Calculator size={18} />}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-bank-navy tracking-tight uppercase leading-none">{item.code || item.atmId}</p>
                                                                {activeTab === 'units' && <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1 block">{item.type}</span>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {activeTab === 'units' && (
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-wrap gap-1.5">
                                                                <span className="px-2 py-0.5 text-[9px] font-black bg-blue-50 text-blue-700 rounded border border-blue-100 uppercase tracking-wider">{item.populationGroup?.replace('_', ' ')}</span>
                                                                {item.size && (
                                                                    <span className="px-2 py-0.5 text-[9px] font-black bg-indigo-50 text-indigo-700 rounded border border-indigo-100 uppercase tracking-wider">{item.size}</span>
                                                                )}
                                                                <span className={cn("px-2 py-0.5 text-[9px] font-black rounded border uppercase tracking-wider", 
                                                                    item.riskCategory === 'HIGH' ? 'bg-red-50 text-red-700 border-red-100' :
                                                                    item.riskCategory === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                                    'bg-green-50 text-green-700 border-green-100'
                                                                )}>{item.riskCategory} Risk</span>
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-bold text-gray-700">{item.nameEn}</p>
                                                        <div className="flex gap-4 mt-1 opacity-60">
                                                            <span className="text-xs font-tamil italic">{item.nameTa || '-'}</span>
                                                            <span className="text-xs font-hindi italic">{item.nameHi || '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button onClick={() => startEdit(item)} className="p-2 text-bank-teal hover:bg-bank-teal/5 rounded-xl transition-all"><Edit2 size={16} /></button>
                                                            <button onClick={() => handleDelete(item.id || '')} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {showForm && activeTab !== 'misUpload' && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 shadow-2xl"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl border border-bank-teal/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 relative">
                        <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 pb-4 border-b border-gray-100">
                            <h3 className="text-2xl font-black text-bank-navy uppercase tracking-tight">
                                {editingItem ? 'Edit' : 'Create New'} {getSingularLabel(activeTab)}
                            </h3>
                            <button
                                onClick={() => { setShowForm(false); setEditingItem(null); }}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-red-500"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 font-bold mb-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                    {error}
                                </div>
                            )}
                            {renderForm()}
                            <div className="flex justify-end pt-6 mt-6 border-t border-gray-100 space-x-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); setEditingItem(null); }}
                                    className="px-6 py-2 rounded-lg font-bold border border-gray-200 hover:bg-gray-50 transition-all text-gray-600"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="bg-bank-navy text-white px-8 py-2 rounded-lg font-bold shadow-lg hover:bg-opacity-90 transition-all flex items-center space-x-2">
                                    <Save size={18} />
                                    <span>Save & Update</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {showTransferModal && transferItem && createPortal(
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in duration-200 relative">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-bank-navy flex items-center gap-2">
                                <ArrowRightLeft size={24} className="text-bank-teal" />
                                <span>Transfer Staff</span>
                            </h3>
                            <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-red-500">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-sm font-bold text-bank-navy">{transferItem.fullNameEn}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-tighter">
                                Currently at: {transferItem.branch?.nameEn || 'N/A'} • {transferItem.designation?.nameEn || 'No Desig'}
                            </p>
                        </div>

                        <form onSubmit={handleTransfer} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Target Branch</label>
                                <select
                                    required
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/50 outline-none font-medium"
                                    value={transferData.branchId}
                                    onChange={(e) => setTransferData({ ...transferData, branchId: e.target.value })}
                                >
                                    <option value="">Select Target Branch...</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.code} - {b.nameEn}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Designation (Optional)</label>
                                <select
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/50 outline-none font-medium"
                                    value={transferData.designationId}
                                    onChange={(e) => setTransferData({ ...transferData, designationId: e.target.value })}
                                >
                                    <option value="">Keep current designation</option>
                                    {designations.map(d => (
                                        <option key={d.id} value={d.id}>{d.nameEn}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Transfer Remarks</label>
                                <textarea
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/50 outline-none font-medium h-20 resize-none"
                                    placeholder="Enter reason for transfer or order reference..."
                                    value={transferData.remarks}
                                    onChange={(e) => setTransferData({ ...transferData, remarks: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowTransferModal(false)}
                                    className="flex-1 py-2 rounded-lg font-bold border border-gray-200 hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 bg-bank-navy text-white py-2 rounded-lg font-bold shadow-lg hover:bg-opacity-90 transition-all">
                                    Confirm Transfer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SettingsManager;



