import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import api from '../../services/api';

// Types
import { BranchRequest, RequestForm } from './types';

// Constants
import { CATEGORIES, PRIORITIES } from './constants';

// Components
import { GLActivationForm } from './components/Forms/GLActivationForm';
import { RequestListItem } from './components/Dashboard/RequestListItem';
import { DetailPanel } from './components/Dashboard/DetailPanel';

const RequestManager: React.FC = () => {
    const [requests, setRequests] = useState<BranchRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'BRANCH' | 'RO'>('BRANCH');
    const [showForm, setShowForm] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<BranchRequest | null>(null);
    const [newComment, setNewComment] = useState('');

    const [formData, setFormData] = useState<RequestForm>({
        titleEn: '',
        contentEn: '',
        category: 'IT',
        priority: 'MEDIUM',
        assignedSection: 'IT',
        contentJson: {} as any
    });

    const fetchRequests = () => {
        setLoading(true);
        const query = viewMode === 'RO' ? '?assignedSection=IT' : '?branchId=B001';
        api.get(`/requests${query}`)
            .then((res: any) => {
                setRequests(res.data.data || res.data);
                setLoading(false);
            })
            .catch((err: any) => {
                console.error('Error fetching requests:', err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchRequests();
    }, [viewMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/requests', {
                ...formData,
                branchId: 'B001',
                userId: 'admin'
            });
            setShowForm(false);
            fetchRequests();
        } catch (error) {
            console.error('Error creating request:', error);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await api.patch(`/requests/${id}`, { status });
            fetchRequests();
            if (selectedRequest?.id === id) {
                setSelectedRequest(prev => prev ? { ...prev, status: status as BranchRequest['status'] } : null);
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleAddComment = async (content: string) => {
        if (!selectedRequest || !content.trim()) return;

        try {
            const response = await api.post(`/requests/${selectedRequest.id}/comments`, {
                content,
                userId: 'admin'
            });
            const comment = response.data;
            setSelectedRequest(prev => prev ? { ...prev, comments: [...prev.comments, comment] } : null);
            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    return (
        <div className="space-y-6 pt-6 h-full flex flex-col px-8 pb-8">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-3xl font-black text-bank-navy">Request Management</h2>
                    <p className="text-gray-500 font-medium">Submit and track branch service requests</p>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
                        <button
                            onClick={() => setViewMode('BRANCH')}
                            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'BRANCH' ? 'bg-white text-bank-navy shadow-sm' : 'text-gray-500 hover:text-bank-navy'}`}
                        >
                            Branch View
                        </button>
                        <button
                            onClick={() => setViewMode('RO')}
                            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'RO' ? 'bg-white text-bank-navy shadow-sm' : 'text-gray-500 hover:text-bank-navy'}`}
                        >
                            RO Section View
                        </button>
                    </div>
                    {viewMode === 'BRANCH' && (
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="bg-bank-navy text-white px-6 py-2.5 rounded-2xl font-black flex items-center space-x-2 hover:bg-opacity-90 transition-all shadow-lg active:scale-95"
                        >
                            <Plus size={18} />
                            <span>{showForm ? 'Cancel' : 'New Request'}</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex space-x-6 min-h-0 overflow-hidden">
                <div className={`flex-1 overflow-y-auto space-y-4 pr-2 ${selectedRequest ? 'w-1/2' : 'w-full'}`}>
                    {showForm && viewMode === 'BRANCH' ? (
                        <div className="bg-white rounded-[2.5rem] p-10 border border-bank-navy/10 shadow-2xl animate-in slide-in-from-top duration-300">
                            <h3 className="text-2xl font-black text-bank-navy mb-8">New Service Request</h3>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Category</label>
                                        <select
                                            className="w-full px-4 py-3 border-2 border-gray-50 rounded-xl outline-none focus:border-bank-navy transition-all text-sm font-bold"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Priority</label>
                                        <select
                                            className="w-full px-4 py-3 border-2 border-gray-50 rounded-xl outline-none focus:border-bank-navy transition-all text-sm font-bold"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        >
                                            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Subject</label>
                                    <input
                                        type="text" required
                                        className="w-full px-4 py-3 border-2 border-gray-50 rounded-xl outline-none focus:border-bank-navy transition-all text-sm font-bold"
                                        placeholder={formData.category === 'GL_HEAD_ACTIVATION' ? "e.g. Activation of Inoperative GL Head XXXX" : "Brief title of your request"}
                                        value={formData.titleEn}
                                        onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                                    />
                                </div>

                                {formData.category === 'GL_HEAD_ACTIVATION' ? (
                                    <GLHeadActivationForm formData={formData} setFormData={setFormData} />
                                ) : (
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Detailed Description</label>
                                        <textarea
                                            rows={4} required
                                            className="w-full px-4 py-3 border-2 border-gray-50 rounded-xl outline-none focus:border-bank-navy transition-all text-sm font-bold"
                                            placeholder="Please provide all necessary details for resolution..."
                                            value={formData.contentEn}
                                            onChange={(e) => setFormData({ ...formData, contentEn: e.target.value })}
                                        />
                                    </div>
                                )}
                                <div className="flex justify-end pt-4">
                                    <button type="submit" className="bg-bank-navy text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:shadow-2xl transition-all active:scale-95">
                                        Submit Request
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        loading ? (
                            <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-bank-navy border-t-transparent rounded-full animate-spin"></div></div>
                        ) : requests.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {requests.map(req => (
                                    <RequestListItem 
                                        key={req.id}
                                        req={req}
                                        isSelected={selectedRequest?.id === req.id}
                                        viewMode={viewMode}
                                        onSelect={setSelectedRequest}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
                                <MessageSquare className="mx-auto text-gray-200 mb-4" size={64} />
                                <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No active requests found</p>
                            </div>
                        )
                    )}
                </div>

                {selectedRequest && (
                    <DetailPanel 
                        req={selectedRequest}
                        onClose={() => setSelectedRequest(null)}
                        viewMode={viewMode}
                        onUpdateStatus={handleUpdateStatus}
                        onAddComment={handleAddComment}
                        newComment={newComment}
                        setNewComment={setNewComment}
                    />
                )}
            </div>
        </div>
    );
};

export default RequestManager;
