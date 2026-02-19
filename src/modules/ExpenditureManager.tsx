import React, { useState, useEffect } from 'react';
import {
    IndianRupee,
    TrendingUp,
    AlertCircle,
    Search,
    Plus,
    Filter,
    Calendar,
    Building2,
    PieChart,
    Save,
    Clock,
    DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

interface Budget {
    id: string;
    section: string;
    financialYear: string;
    allocationAmount: number;
    spentAmount: number;
    _count: { sanctions: number };
}

interface ExpenseSanction {
    id: string;
    title: string;
    sanctionDate: string;
    amount: number;
    section: string;
    vendorName?: string;
    billNo?: string;
    status: string;
    type: string;
    budget: Budget;
}

const ExpenditureManager: React.FC = () => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [sanctions, setSanctions] = useState<ExpenseSanction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filterSection, setFilterSection] = useState('');

    const [form, setForm] = useState({
        title: '',
        amount: 0,
        section: '',
        vendorName: '',
        billNo: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'REVENUE',
        budgetId: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [budgetsRes, sanctionsRes] = await Promise.all([
                fetch('http://localhost:5000/api/expenditure/budgets'),
                fetch(`http://localhost:5000/api/expenditure/sanctions${filterSection ? `?section=${filterSection}` : ''}`)
            ]);
            setBudgets(await budgetsRes.json());
            setSanctions(await sanctionsRes.json());
        } catch (error) {
            console.error('Error fetching expenditure data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filterSection]);

    const handleSaveSanction = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/api/expenditure/sanctions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    sanctionDate: form.date,
                    status: 'APPROVED'
                })
            });
            if (response.ok) {
                setShowForm(false);
                fetchData();
            }
        } catch (error) {
            console.error('Error saving sanction:', error);
        }
    };

    const totalBudget = budgets.reduce((acc, b) => acc + b.allocationAmount, 0);
    const totalSpent = budgets.reduce((acc, b) => acc + b.spentAmount, 0);
    const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return (
        <div className="space-y-6 pt-6 h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy font-bank-noto">Expenditure & Budgets</h2>
                    <p className="text-gray-500 text-sm">Real-time budget tracking & sanction management</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn-primary flex items-center space-x-2 bg-bank-navy text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-all text-sm shadow-lg shadow-bank-navy/10"
                    >
                        <Plus size={18} />
                        <span>New Sanction</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4 shrink-0">
                <div className="card p-5 border-l-4 border-l-bank-teal">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-bank-teal/5 text-bank-teal rounded-lg">
                            <IndianRupee size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">FY 2025-26</span>
                    </div>
                    <p className="text-2xl font-black text-bank-navy">₹{(totalSpent / 100000).toFixed(2)}L</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Utilization</p>
                </div>
                <div className="card p-5 border-l-4 border-l-bank-navy">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-bank-navy/5 text-bank-navy rounded-lg">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-bank-navy bg-bank-navy/5 px-2 py-0.5 rounded-full">{utilization.toFixed(1)}% Used</span>
                    </div>
                    <p className="text-2xl font-black text-bank-navy">₹{(totalBudget / 100000).toFixed(2)}L</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Yearly Budget</p>
                </div>
                <div className="card p-5 border-l-4 border-l-amber-500">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-amber-500/5 text-amber-500 rounded-lg">
                            <Clock size={20} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-bank-navy">{sanctions.length}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Sanctions</p>
                </div>
                <div className="card p-5 border-l-4 border-l-bank-gold">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-bank-gold/5 text-bank-gold rounded-lg">
                            <AlertCircle size={20} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-bank-navy">₹{((totalBudget - totalSpent) / 100000).toFixed(2)}L</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Remaining Budget</p>
                </div>
            </div>

            <div className="flex-1 flex space-x-6 min-h-0">
                {/* Left Side: Sanction Register */}
                <div className="flex-1 flex flex-col space-y-4">
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm shrink-0">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text" placeholder="Search sanction title, vendor, section..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-bank-teal/20 rounded-lg text-sm transition-all"
                            />
                        </div>
                        <div className="flex items-center space-x-3">
                            <Filter size={18} className="text-gray-400" />
                            <select
                                onChange={(e) => setFilterSection(e.target.value)}
                                className="text-sm border-0 bg-transparent font-bold text-bank-navy focus:ring-0 cursor-pointer"
                            >
                                <option value="">All Departments</option>
                                <option value="IT">IT Section</option>
                                <option value="Premises">Premises</option>
                                <option value="Accounts">Accounts</option>
                                <option value="Stationery">Stationery</option>
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
                                {sanctions.map(sanction => (
                                    <div key={sanction.id} className="card p-4 hover:shadow-md transition-all flex items-center justify-between group">
                                        <div className="flex items-center space-x-4">
                                            <div className={`p-3 rounded-xl ${sanction.type === 'CAPITAL' ? 'bg-indigo-50 text-indigo-600' : 'bg-bank-teal/5 text-bank-teal'}`}>
                                                <DollarSign size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <h4 className="font-bold text-bank-navy group-hover:text-bank-teal transition-colors">{sanction.title}</h4>
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${sanction.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-bank-navy/10 text-bank-navy'}`}>{sanction.status}</span>
                                                </div>
                                                <div className="flex items-center space-x-4 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                    <span className="flex items-center space-x-1"><Building2 size={12} /> <span>{sanction.section}</span></span>
                                                    <span className="flex items-center space-x-1"><Calendar size={12} /> <span>{format(new Date(sanction.sanctionDate), 'dd MMM yyyy')}</span></span>
                                                    {sanction.vendorName && <span className="text-bank-navy/60">Vendor: {sanction.vendorName}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-bank-navy">₹{sanction.amount.toLocaleString()}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{sanction.type}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Departmental Utilization */}
                <div className="w-80 space-y-4 overflow-y-auto pr-1 shrink-0">
                    <div className="card p-5">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-bank-navy">Utilization by Section</h3>
                            <PieChart size={18} className="text-bank-gold" />
                        </div>
                        <div className="space-y-6">
                            {budgets.map(budget => {
                                const used = (budget.spentAmount / budget.allocationAmount) * 100;
                                return (
                                    <div key={budget.id}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-bank-navy">{budget.section}</span>
                                            <span className="text-[10px] font-bold text-gray-500">₹{(budget.spentAmount / 100000).toFixed(1)}L / ₹{(budget.allocationAmount / 100000).toFixed(1)}L</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 rounded-full ${used > 90 ? 'bg-red-500' : used > 70 ? 'bg-amber-500' : 'bg-bank-teal'}`}
                                                style={{ width: `${Math.min(used, 100)}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            <span className="text-[9px] font-bold text-gray-400">{used.toFixed(1)}% utilized</span>
                                            <span className="text-[9px] font-black text-bank-navy">{budget._count.sanctions} sanctions</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar Form */}
            {showForm && (
                <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300 border-l border-gray-100 flex flex-col">
                    <div className="p-6 bg-bank-navy text-white flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold">New Expenditure Sanction</h3>
                            <p className="text-blue-200 text-xs">Record a move from departmental budget</p>
                        </div>
                        <button onClick={() => setShowForm(false)} className="text-blue-200 hover:text-white text-2xl">✕</button>
                    </div>

                    <form onSubmit={handleSaveSanction} className="p-6 flex-1 overflow-y-auto space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Sanction Title</label>
                                <input
                                    type="text" required placeholder="Description of expense..."
                                    className="w-full p-3 border-gray-200 rounded-xl focus:ring-2 focus:ring-bank-teal/20 focus:border-bank-teal text-sm"
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Amount (₹)</label>
                                    <input
                                        type="number" required placeholder="0.00"
                                        className="w-full p-3 border-gray-200 rounded-xl focus:ring-2 focus:ring-bank-teal/20 focus:border-bank-teal text-sm font-bold"
                                        onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Sanction Type</label>
                                    <select
                                        className="w-full p-3 border-gray-200 rounded-xl focus:ring-2 focus:ring-bank-teal/20 focus:border-bank-teal text-sm"
                                        onChange={e => setForm({ ...form, type: e.target.value })}
                                    >
                                        <option value="REVENUE">Revenue (Operational)</option>
                                        <option value="CAPITAL">Capital (Assets)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Section / Budget Head</label>
                                    <select
                                        required className="w-full p-3 border-gray-200 rounded-xl focus:ring-2 focus:ring-bank-teal/20 focus:border-bank-teal text-sm"
                                        onChange={e => {
                                            const budget = budgets.find(b => b.id === e.target.value);
                                            setForm({ ...form, budgetId: e.target.value, section: budget?.section || '' });
                                        }}
                                    >
                                        <option value="">Select Budget...</option>
                                        {budgets.map(b => (
                                            <option key={b.id} value={b.id}>{b.section} (Avl: ₹{((b.allocationAmount - b.spentAmount) / 1000).toFixed(1)}K)</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Sanction Date</label>
                                    <input
                                        type="date" className="w-full p-3 border-gray-200 rounded-xl focus:ring-2 focus:ring-bank-teal/20 focus:border-bank-teal text-sm"
                                        value={form.date}
                                        onChange={e => setForm({ ...form, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Vendor/Beneficiary</label>
                                    <input
                                        type="text" placeholder="Optional"
                                        className="w-full p-3 border-gray-200 rounded-xl focus:ring-2 focus:ring-bank-teal/20 focus:border-bank-teal text-sm"
                                        onChange={e => setForm({ ...form, vendorName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Bill/Invoice No.</label>
                                    <input
                                        type="text" placeholder="Optional"
                                        className="w-full p-3 border-gray-200 rounded-xl focus:ring-2 focus:ring-bank-teal/20 focus:border-bank-teal text-sm"
                                        onChange={e => setForm({ ...form, billNo: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start space-x-3">
                            <AlertCircle className="text-amber-500 shrink-0" size={18} />
                            <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                                Submitting this sanction will immediately deduct the amount from the departmental budget and record an entry in the RO Sanction Register.
                            </p>
                        </div>

                        <button type="submit" className="w-full bg-bank-teal text-white py-4 rounded-xl font-bold shadow-xl shadow-bank-teal/10 flex items-center justify-center space-x-2 text-lg hover:scale-[1.01] transition-all">
                            <Save size={20} />
                            <span>Confirm Sanction</span>
                        </button>
                    </form>
                </div>
            )}

            {showForm && (
                <div
                    className="fixed inset-0 bg-bank-navy/40 backdrop-blur-sm z-40 transition-opacity"
                    onClick={() => setShowForm(false)}
                />
            )}
        </div>
    );
};

export default ExpenditureManager;
