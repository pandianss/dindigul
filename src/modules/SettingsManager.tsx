import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getErrorMessage } from '../utils/handleError';
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
    Hash
} from 'lucide-react';

type Tab = 'departments' | 'units' | 'designations' | 'staff';

interface MasterItem {
    id?: string;
    nameEn?: string;
    fullNameEn?: string;
    nameTa?: string;
    fullNameTa?: string;
    nameHi?: string;
    fullNameHi?: string;
    code?: string;
    username?: string;
    type?: string;
    populationGroup?: string;
    address?: string;
    riskCategory?: string;
    riskEffectiveDate?: string;
    specialStatus?: string | string[];
    officeId?: number;
    workId?: number;
    role?: string;
    photo?: { data: string };
    photoData?: string | ArrayBuffer | null;
}


const SettingsManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('departments');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<MasterItem[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form States
    const [formData, setFormData] = useState<MasterItem>({});

    const getEndpoint = (tab: Tab) => {
        if (tab === 'units') return '/branches';
        if (tab === 'staff') return '/users';
        return `/${tab}`;
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const endpoint = getEndpoint(activeTab);
            const res = await api.get(endpoint);
            const json = res.data;
            setData(json);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setData([]); // Clear old data immediately
        fetchData();
        setShowForm(false);
        setEditingItem(null);
        setFormData({});
    }, [activeTab]);

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
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            const endpoint = getEndpoint(activeTab);
            await api.delete(`${endpoint}/${id}`);
            fetchData();
        } catch (err) {
            setError(getErrorMessage(err));
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

    const startEdit = (item: MasterItem) => {
        let parsedFormData = { ...item };

        // Parse specialStatus if it's a JSON string
        if (activeTab === 'units' && item.specialStatus && typeof item.specialStatus === 'string') {
            try {
                parsedFormData.specialStatus = JSON.parse(item.specialStatus);
            } catch (e) {
                parsedFormData.specialStatus = [];
            }
        }

        setEditingItem(item);
        setFormData(parsedFormData);
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
            case 'units':
                return (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Unit Code</label>
                            <input
                                className="w-full p-2 border rounded font-bold"
                                value={formData.code || ''}
                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Office ID (Sorting)</label>
                            <input
                                type="number"
                                className="w-full p-2 border rounded"
                                value={formData.officeId || ''}
                                onChange={e => setFormData({ ...formData, officeId: parseInt(e.target.value) || 0 })}
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Unit Name (English)</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={formData.nameEn || ''}
                                onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                                required
                            />
                        </div>

                        {/* Unit Type & Population Group */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Unit Type</label>
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
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Population Group</label>
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

                        {/* Special Status */}
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Special Status</label>
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

                        {/* Risk Categorization */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Risk Category</label>
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
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Risk Effective Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    className="w-full p-2 border rounded"
                                    value={formData.riskEffectiveDate ? new Date(formData.riskEffectiveDate).toISOString().split('T')[0] : ''}
                                    onChange={e => setFormData({ ...formData, riskEffectiveDate: e.target.value })}
                                />
                            </div>
                        </div>

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
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Address</label>
                            <textarea
                                className="w-full p-2 border rounded"
                                value={formData.address || ''}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>
                );
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
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Full Name (English)</label>
                            <input
                                className="w-full p-2 border rounded"
                                value={formData.fullNameEn || ''}
                                onChange={e => setFormData({ ...formData, fullNameEn: e.target.value })}
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Full Name (Tamil) - தமிழ்</label>
                            <input
                                className="w-full p-2 border rounded font-tamil"
                                value={formData.fullNameTa || ''}
                                onChange={e => setFormData({ ...formData, fullNameTa: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Full Name (Hindi) - हिंदी</label>
                            <input
                                className="w-full p-2 border rounded font-hindi"
                                value={formData.fullNameHi || ''}
                                onChange={e => setFormData({ ...formData, fullNameHi: e.target.value })}
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 pt-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy flex items-center space-x-2">
                        <Settings size={28} />
                        <span>System Settings & Master Data</span>
                    </h2>
                    <p className="text-gray-500">Manage trilingual masters and organizational structure</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn-primary flex items-center space-x-2 bg-bank-teal text-white px-4 py-2 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-md"
                    >
                        <Plus size={18} />
                        <span>Add New Entry</span>
                    </button>
                )}
            </div>

            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                {(['departments', 'units', 'designations', 'staff'] as Tab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${activeTab === tab
                            ? 'bg-white text-bank-navy shadow-sm'
                            : 'text-gray-500 hover:text-bank-navy'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {showForm && (
                <div className="card p-8 bg-white border border-bank-teal/20 shadow-xl animate-in slide-in-from-top duration-300 max-w-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-bank-navy uppercase">
                            {editingItem ? 'Edit' : 'Create New'} {activeTab.slice(0, -1)}
                        </h3>
                        <button onClick={() => { setShowForm(false); setEditingItem(null); }} className="text-gray-400 hover:text-red-500">
                            <X size={24} />
                        </button>
                    </div>
                    <form onSubmit={handleSave} className="space-y-6">
                        {renderForm()}
                        <div className="flex justify-end pt-4 space-x-3">
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setEditingItem(null); }}
                                className="px-6 py-2 rounded-lg font-bold border border-gray-200 hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button type="submit" className="bg-bank-navy text-white px-8 py-2 rounded-lg font-bold shadow-lg hover:bg-opacity-90 transition-all flex items-center space-x-2">
                                <Save size={18} />
                                <span>Save Entry</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 font-bold mb-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Identity / Details</th>
                            {activeTab === 'units' && <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Classification</th>}
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">English Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tamil Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Hindi Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading master data...</td></tr>
                        ) : data.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No entries found for this category.</td></tr>
                        ) : data.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex-shrink-0">
                                            {activeTab === 'staff' && (item.photo?.data) ? (
                                                <img
                                                    src={item.photo.data}
                                                    alt={item.username}
                                                    className="w-10 h-10 rounded-full object-cover border-2 border-bank-navy/10 shadow-sm"
                                                />
                                            ) : (
                                                <div className="p-2 bg-bank-navy/5 text-bank-navy rounded-lg">
                                                    {activeTab === 'departments' && <Hash size={18} />}
                                                    {activeTab === 'units' && <Building2 size={18} />}
                                                    {activeTab === 'designations' && <Briefcase size={18} />}
                                                    {activeTab === 'staff' && <Users size={18} />}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-bank-navy tracking-wide">{item.code || item.username}</p>
                                            {activeTab === 'units' && <p className="text-[10px] text-gray-400 font-bold uppercase">ID: {item.officeId} | {item.type}</p>}
                                            {activeTab === 'designations' && <p className="text-[10px] text-gray-400 font-bold uppercase">Work Order: {item.workId}</p>}
                                        </div>
                                    </div>
                                </td>
                                {activeTab === 'units' && (
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-start gap-1">
                                            {item.populationGroup && (
                                                <span className="inline-flex px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 rounded border border-blue-100 uppercase tracking-wider">
                                                    {item.populationGroup.replace('_', ' ')}
                                                </span>
                                            )}
                                            {item.riskCategory && (
                                                <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider ${item.riskCategory === 'HIGH' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    item.riskCategory === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                        'bg-green-50 text-green-700 border-green-100'
                                                    }`}>
                                                    {item.riskCategory} Risk
                                                </span>
                                            )}
                                            {(() => {
                                                try {
                                                    const statuses = typeof item.specialStatus === 'string' ? JSON.parse(item.specialStatus) : (item.specialStatus || []);
                                                    if (Array.isArray(statuses) && statuses.length > 0) {
                                                        return (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {statuses.map((s: string) => (
                                                                    <span key={s} className="px-1.5 py-0.5 text-[9px] font-semibold border border-gray-200 text-gray-600 bg-gray-50 rounded">
                                                                        {s}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        );
                                                    }
                                                } catch (e) { return null; }
                                            })()}
                                        </div>
                                    </td>
                                )}
                                <td className="px-6 py-4 text-sm font-medium text-gray-700">{item.nameEn || item.fullNameEn}</td>
                                <td className="px-6 py-4 text-sm text-gray-600 font-tamil">{item.nameTa || item.fullNameTa || '-'}</td>
                                <td className="px-6 py-4 text-sm text-gray-600 font-hindi">{item.nameHi || item.fullNameHi || '-'}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => startEdit(item)}
                                            className="p-2 text-bank-teal hover:bg-bank-teal/10 rounded-lg transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id || '')}
                                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SettingsManager;



