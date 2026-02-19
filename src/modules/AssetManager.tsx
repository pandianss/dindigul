import React, { useState, useEffect } from 'react';
import {
    Package,
    Wrench,
    Calendar,
    Building2,
    Search,
    Plus,
    Filter,
    AlertCircle,
    Activity,
    Clock,
    Save,
    History
} from 'lucide-react';
import { format } from 'date-fns';

interface RegionalAsset {
    id: string;
    assetCode: string;
    category: string;
    description: string;
    purchaseDate: string;
    purchaseValue: number;
    condition: string;
    amcExpiry?: string;
    branch: { nameEn: string; code: string };
    maintenanceRecords?: MaintenanceRecord[];
}

interface MaintenanceRecord {
    id: string;
    serviceDate: string;
    serviceProvider: string;
    cost: number;
    remarks?: string;
    nextServiceDue: string;
}

const AssetManager: React.FC = () => {
    const [assets, setAssets] = useState<RegionalAsset[]>([]);
    const [alerts, setAlerts] = useState<RegionalAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<RegionalAsset | null>(null);
    const [branches, setBranches] = useState<any[]>([]);

    const [form, setForm] = useState({
        assetCode: '',
        category: 'FURNITURE',
        description: '',
        purchaseDate: format(new Date(), 'yyyy-MM-dd'),
        purchaseValue: 0,
        condition: 'GOOD',
        amcExpiry: '',
        branchId: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [assetsRes, alertsRes, branchesRes] = await Promise.all([
                fetch('http://localhost:5000/api/assets'),
                fetch('http://localhost:5000/api/assets/alerts'),
                fetch('http://localhost:5000/api/branches')
            ]);
            setAssets(await assetsRes.json());
            setAlerts(await alertsRes.json());
            setBranches(await branchesRes.json());
        } catch (error) {
            console.error('Error fetching asset data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (response.ok) {
                setShowForm(false);
                fetchData();
            }
        } catch (error) {
            console.error('Error saving asset:', error);
        }
    };

    const handleRecordMaintenance = async (assetId: string) => {
        const provider = prompt('Service Provider Name:');
        if (!provider) return;
        const cost = prompt('Service Cost (₹):');
        if (!cost) return;
        const nextDate = prompt('Next Service Due Date (YYYY-MM-DD):');
        if (!nextDate) return;

        try {
            const response = await fetch('http://localhost:5000/api/assets/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetId,
                    serviceDate: new Date(),
                    serviceProvider: provider,
                    cost: parseFloat(cost),
                    nextServiceDue: nextDate,
                    remarks: 'Scheduled maintenance recorded via Portal'
                })
            });
            if (response.ok) {
                fetchData();
            }
        } catch (error) {
            console.error('Error recording maintenance:', error);
        }
    };

    return (
        <div className="space-y-6 pt-6 h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy font-bank-noto">Regional Asset & Maintenance</h2>
                    <p className="text-gray-500 text-sm">Inventory tracking & AMC monitoring for RO property</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="btn-primary flex items-center space-x-2 bg-bank-navy text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-all text-sm shadow-lg shadow-bank-navy/10"
                >
                    <Plus size={18} />
                    <span>Register New Asset</span>
                </button>
            </div>

            {/* Alerts Section */}
            {alerts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-amber-500 text-white rounded-lg">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <h4 className="text-amber-900 font-bold text-sm">Maintenance Alerts</h4>
                            <p className="text-amber-700 text-xs">{alerts.length} assets require AMC renewal or scheduled service within 30 days.</p>
                        </div>
                    </div>
                    <div className="flex -space-x-2">
                        {alerts.slice(0, 3).map((a, i) => (
                            <div key={a.id} className="w-8 h-8 rounded-full bg-white border-2 border-amber-200 flex items-center justify-center text-[10px] font-bold text-amber-600 shadow-sm" style={{ zIndex: 10 - i }}>
                                {a.category[0]}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-1 flex space-x-6 min-h-0">
                {/* Main Asset List */}
                <div className="flex-1 flex flex-col space-y-4">
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm shrink-0">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text" placeholder="Search assets by code, category..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-bank-teal/20 rounded-lg text-sm transition-all"
                            />
                        </div>
                        <div className="flex items-center space-x-3">
                            <Filter size={18} className="text-gray-400" />
                            <select className="text-sm border-0 bg-transparent font-bold text-bank-navy focus:ring-0 cursor-pointer">
                                <option>All Categories</option>
                                <option>FURNITURE</option>
                                <option>IT_HARDWARE</option>
                                <option>MACHINERY</option>
                                <option>LOCKER</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1">
                        {loading ? (
                            <div className="space-y-4 opacity-50">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse"></div>)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {assets.map(asset => (
                                    <div
                                        key={asset.id}
                                        onClick={() => setSelectedAsset(asset)}
                                        className={`card p-4 cursor-pointer hover:shadow-md transition-all border-l-4 group ${selectedAsset?.id === asset.id ? 'border-l-bank-teal bg-bank-teal/5' : 'border-l-bank-navy'}`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{asset.assetCode}</span>
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${asset.condition === 'GOOD' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{asset.condition}</span>
                                                </div>
                                                <h4 className="font-bold text-bank-navy truncate group-hover:text-bank-teal transition-colors leading-tight">{asset.description}</h4>
                                            </div>
                                            <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:bg-bank-teal/10 group-hover:text-bank-teal transition-all">
                                                {asset.category === 'IT_HARDWARE' ? <Activity size={18} /> : asset.category === 'MACHINERY' ? <Wrench size={18} /> : <Package size={18} />}
                                            </div>
                                        </div>
                                        <div className="flex items-end justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center space-x-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                    <Building2 size={12} /> <span>{asset.branch.nameEn}</span>
                                                </div>
                                                <div className="flex items-center space-x-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                    <Calendar size={12} /> <span>Purchase: {format(new Date(asset.purchaseDate), 'MMM yyyy')}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-bank-navy">₹{asset.purchaseValue.toLocaleString()}</p>
                                                {asset.amcExpiry && (
                                                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded">AMC: {format(new Date(asset.amcExpiry), 'dd/MM/yy')}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Vertical Side Panel: Asset Detail & Maintenance */}
                <div className="w-[380px] flex flex-col space-y-4 shrink-0 overflow-hidden">
                    {selectedAsset ? (
                        <>
                            <div className="card flex-1 flex flex-col overflow-hidden bg-white border border-gray-100 shadow-xl">
                                <div className="p-5 bg-bank-navy text-white shrink-0">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-[10px] font-black text-blue-200 uppercase tracking-[0.2em]">{selectedAsset.category}</span>
                                        <button onClick={() => setSelectedAsset(null)} className="text-blue-200 hover:text-white">✕</button>
                                    </div>
                                    <h3 className="text-xl font-bold mb-1">{selectedAsset.description}</h3>
                                    <div className="flex items-center space-x-2 text-xs text-blue-100 mb-4 opacity-80">
                                        <Package size={14} />
                                        <span>Code: {selectedAsset.assetCode}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                                            <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-1">Value</p>
                                            <p className="text-sm font-black">₹{selectedAsset.purchaseValue.toLocaleString()}</p>
                                        </div>
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                                            <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-1">State</p>
                                            <p className="text-sm font-black uppercase">{selectedAsset.condition}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="flex items-center space-x-2 text-xs font-black text-bank-navy uppercase tracking-widest">
                                            <History size={14} className="text-bank-teal" />
                                            <span>Maintenance History</span>
                                        </h4>
                                        <button
                                            onClick={() => handleRecordMaintenance(selectedAsset.id)}
                                            className="text-[10px] font-black text-bank-teal hover:bg-bank-teal/5 px-2 py-1 rounded"
                                        >
                                            + Log Service
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {selectedAsset.maintenanceRecords?.length ? (
                                            selectedAsset.maintenanceRecords.map((record, i) => (
                                                <div key={record.id} className="relative pl-6 pb-2 border-l border-gray-100 last:pb-0">
                                                    <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-bank-teal border-2 border-white shadow-sm" />
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-[10px] font-bold text-bank-navy">{format(new Date(record.serviceDate), 'dd MMM yyyy')}</span>
                                                        <span className="text-[10px] font-black text-bank-teal">₹{record.cost.toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-gray-500 mb-0.5">{record.serviceProvider}</p>
                                                    <p className="text-[10px] text-gray-400 italic mb-2">{record.remarks || 'No remarks recorded'}</p>
                                                    <div className="flex items-center space-x-1.5 text-[9px] font-black text-amber-600 bg-amber-50 w-fit px-1.5 py-0.5 rounded">
                                                        <Clock size={10} />
                                                        <span>Next Service: {format(new Date(record.nextServiceDue), 'dd MMM yyyy')}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                <Wrench size={24} className="text-gray-300 mx-auto mb-2" />
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">No Maintenance Records Found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 p-8 text-center text-gray-400">
                            <Package size={48} className="mb-4 opacity-20" />
                            <h4 className="font-bold text-gray-400 mb-1 italic">Selecting an asset...</h4>
                            <p className="text-xs max-w-[200px]">Choose property from the inventory to view service records and AMC status</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar Form Overlay */}
            {showForm && (
                <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300 border-l border-gray-100 flex flex-col overflow-hidden">
                    <div className="p-6 bg-bank-navy text-white flex items-center justify-between shrink-0">
                        <div>
                            <h3 className="text-xl font-bold">Register Regional Asset</h3>
                            <p className="text-blue-200 text-xs">Record new property for Regional inventory monitoring</p>
                        </div>
                        <button onClick={() => setShowForm(false)} className="text-blue-200 hover:text-white text-2xl">✕</button>
                    </div>

                    <form onSubmit={handleSaveAsset} className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Asset Code</label>
                                <input
                                    type="text" required placeholder="RO/ASS/2026/01"
                                    className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm font-mono"
                                    onChange={e => setForm({ ...form, assetCode: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Category</label>
                                <select
                                    className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                    onChange={e => setForm({ ...form, category: e.target.value })}
                                >
                                    <option value="FURNITURE">Furniture (Steel/Wood)</option>
                                    <option value="IT_HARDWARE">IT Hardware (PC/Server)</option>
                                    <option value="MACHINERY">Machinery (AC/Genset)</option>
                                    <option value="LOCKER">Strong Room / Lockers</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Item Description</label>
                            <input
                                type="text" required placeholder="Detailed description of the asset..."
                                className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                onChange={e => setForm({ ...form, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Purchase Date</label>
                                <input
                                    type="date"
                                    className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                    value={form.purchaseDate}
                                    onChange={e => setForm({ ...form, purchaseDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Purchase Value (₹)</label>
                                <input
                                    type="number" required
                                    className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm font-bold"
                                    onChange={e => setForm({ ...form, purchaseValue: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Location (Branch)</label>
                                <select
                                    required className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                    onChange={e => setForm({ ...form, branchId: e.target.value })}
                                >
                                    <option value="">Select Branch...</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.nameEn} ({b.code})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">AMC/Insurance Expiry</label>
                                <input
                                    type="date"
                                    className="w-full p-2.5 border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 text-sm"
                                    onChange={e => setForm({ ...form, amcExpiry: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start space-x-3">
                            <Activity className="text-blue-500 shrink-0" size={18} />
                            <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                                Once registered, regional office can monitor the service lifecycle and condition of this asset. Assets require physical verification during annual audit.
                            </p>
                        </div>

                        <button type="submit" className="w-full bg-bank-navy text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center space-x-2 text-lg hover:gradient-animate hover:scale-[1.01] transition-all">
                            <Save size={20} />
                            <span>Save to Inventory</span>
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

export default AssetManager;
