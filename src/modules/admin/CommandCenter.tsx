import React, { useState, useEffect } from 'react';
import { Megaphone, MessageSquare, Plus, Trash2, Save, AlertCircle, Info, Send } from 'lucide-react';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/handleError';

interface SrmMessage {
    id?: string;
    name: string;
    title: string;
    region: string;
    message: string;
    highlight: string;
    isActive: boolean;
}

interface TickerData {
    id?: string;
    text: string;
    isActive: boolean;
    expiresAt?: string | null;
    linkUrl?: string | null;
}

const CommandCenter: React.FC = () => {
    const [srmForm, setSrmForm] = useState<SrmMessage>({
        name: 'S. Pandian',
        title: 'Senior Regional Manager',
        region: 'Dindigul Region',
        highlight: 'Our commitment to excellence drives our digital transformation.',
        message: 'Dear Team, as we move towards a more integrated digital ecosystem, your role in adopting and championing these tools is crucial. Let us continue to serve our customers with the same passion and dedication.',
        isActive: true
    });

    const [tickers, setTickers] = useState<TickerData[]>([]);
    const [newTicker, setNewTicker] = useState({
        text: '',
        expiresAt: '',
        linkUrl: ''
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch current config to prepopulate SRM form
            const resConfig = await api.get('/dashboard/config');
            if (resConfig.data.srmMessage) {
                setSrmForm(resConfig.data.srmMessage);
            }

            // Fetch all tickers for management
            const resTickers = await api.get('/dashboard/admin/tickers');
            setTickers(resTickers.data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSrmSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        try {
            await api.post('/dashboard/srm-message', srmForm);
            setSuccessMessage('Regional Manager\'s message updated successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleAddTicker = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTicker.text.trim()) return;
        setError(null);
        try {
            await api.post('/dashboard/tickers', newTicker);
            setNewTicker({ text: '', expiresAt: '', linkUrl: '' });
            fetchData();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleToggleTicker = async (ticker: TickerData) => {
        try {
            await api.put(`/dashboard/tickers/${ticker.id}`, { isActive: !ticker.isActive });
            fetchData();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleDeleteTicker = async (id: string) => {
        if (!window.confirm('Delete this ticker?')) return;
        try {
            await api.delete(`/dashboard/tickers/${id}`);
            fetchData();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">Initializing Command Center...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h3 className="text-xl font-bold text-bank-navy uppercase tracking-tight flex items-center gap-2">
                    <Megaphone size={24} className="text-bank-teal" />
                    <span>Command Center</span>
                </h3>
                <p className="text-xs text-gray-500 font-medium">Manage top-level communications and dashboard broadcasts.</p>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-lg flex items-center space-x-2">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                </div>
            )}

            {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold rounded-lg flex items-center space-x-2">
                    <Info size={14} />
                    <span>{successMessage}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* SRM Message Section */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <MessageSquare size={20} className="text-bank-teal" />
                        <h4 className="font-black text-bank-navy uppercase tracking-widest text-sm italic">Regional Manager's Message</h4>
                    </div>

                    <form onSubmit={handleSrmSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Manager Name</label>
                                <input
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 focus:border-bank-teal outline-none text-sm font-bold transition-all"
                                    value={srmForm.name}
                                    onChange={e => setSrmForm({ ...srmForm, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Designation / Title</label>
                                <input
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 focus:border-bank-teal outline-none text-sm font-bold transition-all"
                                    value={srmForm.title}
                                    onChange={e => setSrmForm({ ...srmForm, title: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Region / Office</label>
                            <input
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 focus:border-bank-teal outline-none text-sm font-bold transition-all"
                                value={srmForm.region}
                                onChange={e => setSrmForm({ ...srmForm, region: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Message Highlight (Quote Style)</label>
                            <input
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 focus:border-bank-teal outline-none text-sm font-bold italic transition-all text-bank-navy"
                                value={srmForm.highlight}
                                onChange={e => setSrmForm({ ...srmForm, highlight: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Full Message Body</label>
                            <textarea
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 focus:border-bank-teal outline-none text-sm min-h-[150px] transition-all"
                                value={srmForm.message}
                                onChange={e => setSrmForm({ ...srmForm, message: e.target.value })}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full flex items-center justify-center space-x-2 bg-bank-navy text-white px-8 py-3 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-opacity-95 transition-all shadow-lg hover:shadow-bank-navy/20"
                        >
                            <Save size={16} />
                            <span>Update Profile Message</span>
                        </button>
                    </form>
                </div>

                {/* Tickers Section */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Send size={20} className="text-bank-teal" />
                        <h4 className="font-black text-bank-navy uppercase tracking-widest text-sm italic">News Ticker Broadcasts</h4>
                    </div>

                    <form onSubmit={handleAddTicker} className="space-y-4 mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Ticker Message</label>
                            <input
                                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 focus:border-bank-teal outline-none text-sm font-bold transition-all"
                                placeholder="Enter short news or announcement..."
                                value={newTicker.text}
                                onChange={e => setNewTicker({ ...newTicker, text: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Expiry Date (Optional)</label>
                                <input
                                    type="date"
                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 focus:border-bank-teal outline-none text-sm font-bold transition-all"
                                    value={newTicker.expiresAt}
                                    onChange={e => setNewTicker({ ...newTicker, expiresAt: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Hyperlink (Optional)</label>
                                <input
                                    type="url"
                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-teal/20 focus:border-bank-teal outline-none text-sm font-bold transition-all"
                                    placeholder="https://..."
                                    value={newTicker.linkUrl}
                                    onChange={e => setNewTicker({ ...newTicker, linkUrl: e.target.value })}
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-bank-teal text-white py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                            <Plus size={18} />
                            <span>Add New Broadcast</span>
                        </button>
                    </form>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {tickers.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-gray-50 rounded-xl">
                                <p className="text-gray-300 text-[10px] font-black uppercase tracking-[0.2em]">No active tickers</p>
                            </div>
                        ) : (
                            tickers.map(ticker => (
                                <div key={ticker.id} className="group flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-bank-teal/30 transition-all">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className={`text-sm font-bold ${ticker.isActive ? 'text-bank-navy' : 'text-gray-400 line-through'} line-clamp-1`}>
                                                {ticker.text}
                                            </p>
                                            {ticker.linkUrl && <span className="text-[8px] bg-bank-gold/20 text-bank-gold px-1.5 py-0.5 rounded font-black uppercase">LINK</span>}
                                            {ticker.expiresAt && <span className="text-[8px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-black uppercase">EXP: {new Date(ticker.expiresAt).toLocaleDateString()}</span>}
                                        </div>
                                        {!ticker.isActive && <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Disabled</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleTicker(ticker)}
                                            className={`p-1.5 rounded-lg transition-all ${ticker.isActive ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-300 hover:bg-gray-100'}`}
                                            title={ticker.isActive ? 'Deactivate' : 'Activate'}
                                        >
                                            <div className={`w-8 h-4 rounded-full relative transition-colors ${ticker.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${ticker.isActive ? 'left-4.5' : 'left-0.5'}`} />
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTicker(ticker.id!)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommandCenter;
