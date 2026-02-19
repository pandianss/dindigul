import React, { useState, useEffect } from 'react';
import {
    Truck,
    ArrowDownLeft,
    ArrowUpRight,
    Package,
    Search,
    Plus,
    Clock,
    Building2,
    Save,
    PackagePlus,
    PackageMinus
} from 'lucide-react';
import { format } from 'date-fns';

interface DispatchRecord {
    id: string;
    type: 'INWARD' | 'OUTWARD';
    subject: string;
    sender: string;
    recipient: string;
    referenceNo?: string;
    consignmentNo?: string;
    status: string;
    date: string;
}

interface StationeryItem {
    id: string;
    nameEn: string;
    stockLevel: number;
    movements: any[];
}

const DispatchManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'INWARD' | 'OUTWARD' | 'LOGISTICS'>('INWARD');
    const [records, setRecords] = useState<DispatchRecord[]>([]);
    const [stationery, setStationery] = useState<StationeryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form states
    const [dispatchForm, setDispatchForm] = useState({
        subject: '',
        sender: '',
        recipient: '',
        referenceNo: '',
        consignmentNo: '',
        date: format(new Date(), 'yyyy-MM-dd')
    });

    const [stockForm, setStockForm] = useState({
        itemId: '',
        branchId: '',
        type: 'ISSUE', // ISSUE or RECEIPT
        quantity: 0,
        remarks: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [dispatchRes, logisticsRes] = await Promise.all([
                fetch('http://localhost:5000/api/dispatch'),
                fetch('http://localhost:5000/api/logistics/stock')
            ]);
            setRecords(await dispatchRes.json());
            setStationery(await logisticsRes.json());
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveDispatch = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetch('http://localhost:5000/api/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...dispatchForm, type: activeTab === 'LOGISTICS' ? 'OUTWARD' : activeTab })
            });
            setShowForm(false);
            fetchData();
        } catch (error) {
            console.error('Error saving dispatch:', error);
        }
    };

    const handleSaveMovement = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetch('http://localhost:5000/api/logistics/movement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stockForm)
            });
            setShowForm(false);
            fetchData();
        } catch (error) {
            console.error('Error saving movement:', error);
        }
    };

    return (
        <div className="space-y-6 pt-6 h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy font-bank-noto">Dispatch & Logistics</h2>
                    <p className="text-gray-500 text-sm">RO Inward/Outward Registers & Stationery Inventory</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => { setActiveTab('INWARD'); setShowForm(false); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-all ${activeTab === 'INWARD' ? 'bg-white text-bank-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <ArrowDownLeft size={16} /> <span>Inward</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('OUTWARD'); setShowForm(false); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-all ${activeTab === 'OUTWARD' ? 'bg-white text-bank-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <ArrowUpRight size={16} /> <span>Outward</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('LOGISTICS'); setShowForm(false); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-all ${activeTab === 'LOGISTICS' ? 'bg-white text-bank-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Package size={16} /> <span>Logistics</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex space-x-6 min-h-0">
                <div className="flex-1 flex flex-col space-y-4">
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text" placeholder="Search subject, sender or consignment..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-bank-teal/20 rounded-lg text-sm transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setShowForm(true)}
                            className="btn-primary flex items-center space-x-2 bg-bank-navy text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-all text-sm"
                        >
                            <Plus size={18} />
                            <span>New {activeTab === 'LOGISTICS' ? 'Movement' : 'Entry'}</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1">
                        {loading ? (
                            <div className="grid grid-cols-1 gap-4 opacity-50">
                                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse"></div>)}
                            </div>
                        ) : activeTab === 'LOGISTICS' ? (
                            <div className="grid grid-cols-2 gap-4">
                                {stationery.map(item => (
                                    <div key={item.id} className="card p-6 border-bank-navy/5 hover:border-bank-teal/30 transition-all group">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-3 bg-bank-teal/5 text-bank-teal rounded-xl group-hover:bg-bank-teal group-hover:text-white transition-colors">
                                                <Package size={24} />
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-bank-navy">{item.stockLevel}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Curr. Stock</p>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-bank-navy mb-1">{item.nameEn}</h3>
                                        <div className="space-y-2 mt-4">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Recent Movement</p>
                                            {item.movements.map((mv: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50">
                                                    <div className="flex items-center space-x-2">
                                                        {mv.type === 'RECEIPT' ? <Plus size={12} className="text-green-500" /> : <ArrowUpRight size={12} className="text-amber-500" />}
                                                        <span className="font-medium">{mv.type === 'RECEIPT' ? 'Received' : `Issued to ${mv.branch?.nameEn || 'Internal'}`}</span>
                                                    </div>
                                                    <span className="font-bold text-gray-600">{mv.quantity} units</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {records.filter(r => r.type === activeTab).map(record => (
                                    <div key={record.id} className="card p-4 hover:shadow-md transition-all border-l-4 border-l-bank-navy flex items-center justify-between group">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-1">
                                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 uppercase">#{record.referenceNo || 'REG-DISP'}</span>
                                                <h4 className="font-bold text-bank-navy group-hover:text-bank-teal transition-colors">{record.subject}</h4>
                                            </div>
                                            <div className="flex items-center space-x-6 text-xs text-gray-500">
                                                <div className="flex items-center space-x-1">
                                                    <Building2 size={12} />
                                                    <span>{activeTab === 'INWARD' ? `From: ${record.sender}` : `To: ${record.recipient}`}</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <Clock size={12} />
                                                    <span>{format(new Date(record.date), 'dd MMM yyyy')}</span>
                                                </div>
                                                {record.consignmentNo && (
                                                    <div className="flex items-center space-x-1 text-bank-gold font-bold">
                                                        <Truck size={12} />
                                                        <span>{record.consignmentNo}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${record.status === 'RECEIVED' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {record.status}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Form Overlay - Sidebar Style */}
                {showForm && (
                    <div className="w-96 card border-bank-navy/10 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col p-0 overflow-hidden">
                        <div className="p-6 bg-bank-navy text-white flex items-center justify-between">
                            <h3 className="font-bold text-lg">New {activeTab === 'LOGISTICS' ? 'Logistics Entry' : `${activeTab.toLowerCase()} Entry`}</h3>
                            <button onClick={() => setShowForm(false)} className="text-blue-200 hover:text-white">✕</button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                            {activeTab === 'LOGISTICS' ? (
                                <form onSubmit={handleSaveMovement} className="space-y-5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Stationery Item</label>
                                        <select
                                            required className="w-full p-2.5 border rounded-lg text-sm bg-gray-50"
                                            onChange={e => setStockForm({ ...stockForm, itemId: e.target.value })}
                                        >
                                            <option value="">Select Item...</option>
                                            {stationery.map(item => <option key={item.id} value={item.id}>{item.nameEn}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        <button
                                            type="button" onClick={() => setStockForm({ ...stockForm, type: 'RECEIPT' })}
                                            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-xs font-bold transition-all ${stockForm.type === 'RECEIPT' ? 'bg-bank-teal text-white shadow-sm' : 'text-gray-500'}`}
                                        >
                                            <PackagePlus size={14} /> <span>Receipt</span>
                                        </button>
                                        <button
                                            type="button" onClick={() => setStockForm({ ...stockForm, type: 'ISSUE' })}
                                            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-xs font-bold transition-all ${stockForm.type === 'ISSUE' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500'}`}
                                        >
                                            <PackageMinus size={14} /> <span>Issue</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Quantity</label>
                                            <input
                                                type="number" required min="1" className="w-full p-2.5 border rounded-lg text-sm"
                                                onChange={e => setStockForm({ ...stockForm, quantity: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{stockForm.type === 'ISSUE' ? 'To Branch' : 'Vendor/Source'}</label>
                                            <input
                                                type="text" placeholder="Branch Code or Name" className="w-full p-2.5 border rounded-lg text-sm"
                                                onChange={e => setStockForm({ ...stockForm, branchId: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Remarks</label>
                                        <textarea
                                            className="w-full p-2.5 border rounded-lg text-sm" rows={3}
                                            onChange={e => setStockForm({ ...stockForm, remarks: e.target.value })}
                                        />
                                    </div>
                                    <button type="submit" className="w-full bg-bank-teal text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center space-x-2 mt-4">
                                        <Save size={18} /> <span>Log Movement</span>
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleSaveDispatch} className="space-y-5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Subject / Description</label>
                                        <input
                                            type="text" required className="w-full p-2.5 border rounded-lg text-sm"
                                            onChange={e => setDispatchForm({ ...dispatchForm, subject: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{activeTab === 'INWARD' ? 'Sender' : 'Recipient'}</label>
                                        <input
                                            type="text" required className="w-full p-2.5 border rounded-lg text-sm"
                                            onChange={e => setDispatchForm({ ...dispatchForm, sender: activeTab === 'INWARD' ? e.target.value : 'Regional Office', recipient: activeTab === 'OUTWARD' ? e.target.value : 'Regional Office' })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Reference No.</label>
                                            <input
                                                type="text" className="w-full p-2.5 border rounded-lg text-sm"
                                                onChange={e => setDispatchForm({ ...dispatchForm, referenceNo: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Date</label>
                                            <input
                                                type="date" required className="w-full p-2.5 border rounded-lg text-sm"
                                                value={dispatchForm.date}
                                                onChange={e => setDispatchForm({ ...dispatchForm, date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Consignment / Tracking No.</label>
                                        <div className="relative">
                                            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="text" className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm"
                                                placeholder="Speed Post / Professional Courier..."
                                                onChange={e => setDispatchForm({ ...dispatchForm, consignmentNo: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full bg-bank-navy text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center space-x-2 mt-4">
                                        <Save size={18} /> <span>Submit to Register</span>
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DispatchManager;
