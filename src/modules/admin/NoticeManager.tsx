import React, { useState, useEffect, useRef } from 'react';
import { Bell, Plus, Trash2, Edit2, X, Save, Pin, CheckCircle, AlertCircle, Image as ImageIcon, Upload } from 'lucide-react';
import api, { getStaticUrl } from '../../services/api';
import { getErrorMessage } from '../../utils/handleError';

interface Photo {
    id: string;
    photoUrl: string;
}

interface Notice {
    id?: string;
    titleEn: string;
    titleTa?: string;
    titleHi?: string;
    contentEn: string;
    contentTa?: string;
    contentHi?: string;
    category: string;
    priority: string;
    isPinned: boolean;
    requiresAck: boolean;
    targetRole?: string;
    branchId?: string;
    photoId?: string;
    photo?: Photo;
    photoData?: string; // For uploads
}

const NoticeManager: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<Notice | null>(null);
    const [formData, setFormData] = useState<Notice>({
        titleEn: '',
        titleTa: '',
        titleHi: '',
        contentEn: '',
        contentTa: '',
        contentHi: '',
        category: 'GENERAL',
        priority: 'NORMAL',
        isPinned: false,
        requiresAck: false,
        photoData: undefined
    });
    const [error, setError] = useState<string | null>(null);

    const fetchNotices = async () => {
        setLoading(true);
        try {
            const res = await api.get('/notices');
            setNotices(res.data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotices();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, photoData: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingItem?.id) {
                await api.put(`/notices/${editingItem.id}`, formData);
            } else {
                await api.post('/notices', formData);
            }
            setShowForm(false);
            setEditingItem(null);
            setFormData({
                titleEn: '',
                titleTa: '',
                titleHi: '',
                contentEn: '',
                contentTa: '',
                contentHi: '',
                category: 'GENERAL',
                priority: 'NORMAL',
                isPinned: false,
                requiresAck: false,
                photoData: undefined
            });
            fetchNotices();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this bulletin?')) return;
        try {
            await api.delete(`/notices/${id}`);
            fetchNotices();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const startEdit = (item: Notice) => {
        setEditingItem(item);
        setFormData({ ...item, photoData: undefined }); // Don't pre-fill base64 for existing, only if they change it
        setShowForm(true);
    };

    const resetForm = () => {
        setEditingItem(null);
        setFormData({
            titleEn: '',
            titleTa: '',
            titleHi: '',
            contentEn: '',
            contentTa: '',
            contentHi: '',
            category: 'GENERAL',
            priority: 'NORMAL',
            isPinned: false,
            requiresAck: false,
            photoData: undefined
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-bank-navy uppercase tracking-tight">Regional Bulletins & Achievements</h3>
                    <p className="text-xs text-gray-500 font-medium">Broadcast news, operational updates, and regional triumphs.</p>
                </div>
                <button
                    onClick={() => { setShowForm(true); resetForm(); }}
                    className="flex items-center space-x-2 bg-bank-navy text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-opacity-90 transition-all shadow-md"
                >
                    <Plus size={16} />
                    <span>Create Bulletin</span>
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-lg flex items-center space-x-2">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                </div>
            )}

            {showForm && (
                <div className="bg-white border-2 border-bank-navy/10 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="font-black text-bank-navy uppercase tracking-widest text-sm italic">
                            {editingItem ? 'Edit Bulletin' : 'New Bulletin Configuration'}
                        </h4>
                        <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Title (English)</label>
                                <input
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-navy/10 focus:border-bank-navy outline-none text-sm font-bold transition-all"
                                    value={formData.titleEn}
                                    onChange={e => setFormData({ ...formData, titleEn: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">தலைப்பு (தமிழ்)</label>
                                <input
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-navy/10 focus:border-bank-navy outline-none text-sm font-bold transition-all"
                                    value={formData.titleTa || ''}
                                    onChange={e => setFormData({ ...formData, titleTa: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">शीर्षक (हिंदी)</label>
                                <input
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-navy/10 focus:border-bank-navy outline-none text-sm font-bold transition-all"
                                    value={formData.titleHi || ''}
                                    onChange={e => setFormData({ ...formData, titleHi: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Content (English)</label>
                                <textarea
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-navy/10 focus:border-bank-navy outline-none text-sm min-h-[100px] transition-all"
                                    value={formData.contentEn}
                                    onChange={e => setFormData({ ...formData, contentEn: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">உள்ளடக்கம் (தமிழ்)</label>
                                <textarea
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-navy/10 focus:border-bank-navy outline-none text-sm min-h-[100px] transition-all"
                                    value={formData.contentTa || ''}
                                    onChange={e => setFormData({ ...formData, contentTa: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">विषय (हिंदी)</label>
                                <textarea
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-navy/10 focus:border-bank-navy outline-none text-sm min-h-[100px] transition-all"
                                    value={formData.contentHi || ''}
                                    onChange={e => setFormData({ ...formData, contentHi: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Category</label>
                            <select
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-navy/10 focus:border-bank-navy outline-none text-sm font-bold transition-all"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="GENERAL">General News</option>
                                <option value="ACHIEVEMENT">Achievement / Triumph</option>
                                <option value="OPERATIONAL">Operational Circular</option>
                                <option value="COMPLIANCE">Compliance Alert</option>
                                <option value="HR">HR & Welfare</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Priority Level</label>
                            <div className="flex gap-4 p-1 bg-gray-50 rounded-lg border border-gray-200">
                                {['NORMAL', 'URGENT'].map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, priority: p })}
                                        className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${formData.priority === p
                                            ? (p === 'URGENT' ? 'bg-red-500 text-white shadow-sm' : 'bg-bank-navy text-white shadow-sm')
                                            : 'text-gray-400 hover:bg-gray-100'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Featured Image (16:9 Recommended)</label>
                            <div className="flex items-start gap-4">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-32 h-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-bank-navy transition-colors overflow-hidden"
                                >
                                    {formData.photoData || formData.photo?.photoUrl ? (
                                        <img
                                            src={formData.photoData || getStaticUrl(formData.photo?.photoUrl)}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <>
                                            <Upload size={20} className="text-gray-300 mb-1" />
                                            <span className="text-[8px] font-bold text-gray-400 uppercase">Upload</span>
                                        </>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                {formData.photoData && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, photoData: undefined })}
                                        className="text-[10px] font-bold text-red-500 hover:underline mt-1"
                                    >
                                        Clear Image
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <label className="flex items-center space-x-3 group cursor-pointer">
                                <div className={`w-10 h-5 rounded-full p-1 transition-colors ${formData.isPinned ? 'bg-bank-gold' : 'bg-gray-200'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${formData.isPinned ? 'translate-x-5' : ''}`} />
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={formData.isPinned}
                                    onChange={e => setFormData({ ...formData, isPinned: e.target.checked })}
                                />
                                <div className="flex items-center gap-1.5">
                                    <Pin size={14} className={formData.isPinned ? 'text-bank-gold' : 'text-gray-400'} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pin to Top</span>
                                </div>
                            </label>

                            <label className="flex items-center space-x-3 group cursor-pointer">
                                <div className={`w-10 h-5 rounded-full p-1 transition-colors ${formData.requiresAck ? 'bg-bank-teal' : 'bg-gray-200'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${formData.requiresAck ? 'translate-x-5' : ''}`} />
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={formData.requiresAck}
                                    onChange={e => setFormData({ ...formData, requiresAck: e.target.checked })}
                                />
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle size={14} className={formData.requiresAck ? 'text-bank-teal' : 'text-gray-400'} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Require Acknowledgement</span>
                                </div>
                            </label>
                        </div>

                        <div className="col-span-2 flex justify-end pt-4 border-t border-gray-100 space-x-3">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex items-center space-x-2 bg-bank-navy text-white px-8 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-opacity-95 transition-all shadow-lg hover:shadow-bank-navy/20"
                            >
                                <Save size={16} />
                                <span>{editingItem ? 'Update Bulletin' : 'Publish Bulletin'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Bulletin</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Category</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Attributes</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic font-medium">Loading bulletin board...</td>
                            </tr>
                        ) : notices.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center">
                                    <Bell size={40} className="mx-auto text-gray-100 mb-3" />
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No active bulletins</p>
                                </td>
                            </tr>
                        ) : (
                            notices.map(notice => (
                                <tr key={notice.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {notice.photo?.photoUrl ? (
                                                <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden shrink-0 border border-gray-100 shadow-sm">
                                                    <img src={getStaticUrl(notice.photo.photoUrl)} className="w-full h-full object-cover" alt="Thumb" />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                                                    <ImageIcon size={16} className="text-gray-300" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    {notice.isPinned && <Pin size={12} className="text-bank-gold" />}
                                                    <div className="font-bold text-bank-navy text-sm truncate">{notice.titleEn}</div>
                                                </div>
                                                <div className="text-[10px] text-gray-400 truncate max-w-xs">{notice.contentEn}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border ${notice.category === 'ACHIEVEMENT' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                            notice.category === 'OPERATIONAL' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                'bg-gray-100 text-gray-600 border-gray-200'
                                            }`}>
                                            {notice.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            {notice.priority === 'URGENT' && (
                                                <span className="text-[8px] font-black px-1.5 py-0.25 rounded bg-red-100 text-red-600 uppercase">Urgent</span>
                                            )}
                                            {notice.requiresAck && (
                                                <span className="text-[8px] font-black px-1.5 py-0.25 rounded bg-bank-teal/10 text-bank-teal uppercase">Requires Ack</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2 transition-opacity">
                                            <button
                                                onClick={() => startEdit(notice)}
                                                className="p-1.5 text-gray-400 hover:text-bank-navy hover:bg-white rounded-lg transition-all shadow-sm"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(notice.id!)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-all shadow-sm"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default NoticeManager;
