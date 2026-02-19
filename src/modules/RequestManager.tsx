import React, { useState, useEffect } from 'react';
import {
    Plus,
    MessageSquare,
    Clock,
    AlertCircle,
    User,
    Send,
    Tag,
} from 'lucide-react';
import { format } from 'date-fns';

interface BranchRequest {
    id: string;
    titleEn: string;
    contentEn: string;
    category: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    branch: { nameEn: string, code: string };
    user: { fullNameEn: string };
    assignedSection?: string;
    resolutionNotes?: string;
    createdAt: string;
    comments: {
        id: string;
        content: string;
        user: { fullNameEn: string };
        createdAt: string;
    }[];
}

const CATEGORY_ICONS: Record<string, any> = {
    'STATIONERY': Tag,
    'HR': User,
    'IT': AlertCircle,
    'PREMISES': MessageSquare,
    'OTHER': Clock
};

const STATUS_COLORS: Record<string, string> = {
    'OPEN': 'bg-blue-100 text-blue-700',
    'IN_PROGRESS': 'bg-amber-100 text-amber-700',
    'RESOLVED': 'bg-green-100 text-green-700',
    'CLOSED': 'bg-gray-100 text-gray-700'
};

const RequestManager: React.FC = () => {
    const [requests, setRequests] = useState<BranchRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'BRANCH' | 'RO'>('BRANCH'); // Toggle for MVP
    const [showForm, setShowForm] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<BranchRequest | null>(null);
    const [newComment, setNewComment] = useState('');

    const [formData, setFormData] = useState({
        titleEn: '',
        contentEn: '',
        category: 'IT',
        priority: 'MEDIUM',
        assignedSection: 'IT'
    });

    const fetchRequests = () => {
        setLoading(true);
        const query = viewMode === 'RO' ? '?assignedSection=IT' : '?branchId=B001'; // Mock filters
        fetch(`http://localhost:5000/api/requests${query}`)
            .then(res => res.json())
            .then(data => {
                setRequests(data);
                setLoading(false);
            })
            .catch(err => {
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
            await fetch('http://localhost:5000/api/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    branchId: 'B001', // Mock branch
                    userId: 'admin' // Mock user
                })
            });
            setShowForm(false);
            fetchRequests();
        } catch (error) {
            console.error('Error creating request:', error);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await fetch(`http://localhost:5000/api/requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            fetchRequests();
            if (selectedRequest?.id === id) {
                setSelectedRequest(prev => prev ? { ...prev, status: status as any } : null);
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRequest || !newComment.trim()) return;

        try {
            const response = await fetch(`http://localhost:5000/api/requests/${selectedRequest.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newComment,
                    userId: 'admin'
                })
            });
            const comment = await response.json();
            setSelectedRequest(prev => prev ? { ...prev, comments: [...prev.comments, comment] } : null);
            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    return (
        <div className="space-y-6 pt-6 h-full flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy">Request Management</h2>
                    <p className="text-gray-500">Submit and track branch service requests</p>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('BRANCH')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'BRANCH' ? 'bg-white text-bank-navy shadow-sm' : 'text-gray-500 hover:text-bank-navy'}`}
                        >
                            Branch View
                        </button>
                        <button
                            onClick={() => setViewMode('RO')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'RO' ? 'bg-white text-bank-navy shadow-sm' : 'text-gray-500 hover:text-bank-navy'}`}
                        >
                            RO Section View
                        </button>
                    </div>
                    {viewMode === 'BRANCH' && (
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="btn-primary flex items-center space-x-2 bg-bank-navy text-white px-4 py-2 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-md"
                        >
                            <Plus size={18} />
                            <span>{showForm ? 'Cancel' : 'New Request'}</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex space-x-6 min-h-0 overflow-hidden">
                {/* Request List */}
                <div className={`flex-1 overflow-y-auto space-y-4 pr-2 ${selectedRequest ? 'w-1/2' : 'w-full'}`}>
                    {showForm && viewMode === 'BRANCH' ? (
                        <div className="card p-8 bg-white border border-bank-navy/10 animate-in slide-in-from-top duration-300">
                            <h3 className="text-xl font-bold text-bank-navy mb-6">New Service Request</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                                        <select
                                            className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-bank-navy"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            <option value="IT">IT Support / Hardware</option>
                                            <option value="HR">HR / Staffing</option>
                                            <option value="STATIONERY">Stationery Requisition</option>
                                            <option value="PREMISES">Premises / Maintenance</option>
                                            <option value="OTHER">Other Requests</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Priority</label>
                                        <select
                                            className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-bank-navy"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        >
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="URGENT">Urgent!</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Subject</label>
                                    <input
                                        type="text" required
                                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-bank-navy"
                                        placeholder="Brief title of your request"
                                        value={formData.titleEn}
                                        onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Detailed Description</label>
                                    <textarea
                                        rows={4} required
                                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-bank-navy"
                                        placeholder="Please provide all necessary details for resolution..."
                                        value={formData.contentEn}
                                        onChange={(e) => setFormData({ ...formData, contentEn: e.target.value })}
                                    />
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button type="submit" className="bg-bank-teal text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all">
                                        Submit Request
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        loading ? (
                            <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-bank-navy" /></div>
                        ) : requests.length > 0 ? (
                            requests.map(req => (
                                <div
                                    key={req.id}
                                    onClick={() => setSelectedRequest(req)}
                                    className={`card p-5 cursor-pointer transition-all border ${selectedRequest?.id === req.id ? 'border-bank-navy ring-1 ring-bank-navy bg-blue-50/30' : 'border-gray-100'}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex space-x-4">
                                            <div className={`p-3 rounded-xl bg-gray-50 ${STATUS_COLORS[req.status]}`}>
                                                {React.createElement(CATEGORY_ICONS[req.category] || Tag, { size: 24 })}
                                            </div>
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <h4 className="font-bold text-bank-navy">{req.titleEn}</h4>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${STATUS_COLORS[req.status]}`}>
                                                        {req.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 font-medium mt-1">
                                                    {viewMode === 'RO' ? `${req.branch.nameEn} (Code: ${req.branch.code})` : `Category: ${req.category}`}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-0.5 italic">
                                                    Requested on {format(new Date(req.createdAt), 'dd MMM, hh:mm a')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600`}>
                                            {req.priority}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-16 card border-dashed bg-gray-50">
                                <MessageSquare className="mx-auto text-gray-300 mb-2" size={48} />
                                <p className="text-gray-500 font-medium">No requests found</p>
                            </div>
                        )
                    )}
                </div>

                {/* Detail Panel */}
                {selectedRequest && (
                    <div className="w-1/2 overflow-hidden flex flex-col card p-0 bg-white shadow-2xl animate-in slide-in-from-right duration-300 border-l border-bank-navy/10">
                        <div className="p-6 border-b shrink-0 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-bank-navy text-xl">{selectedRequest.titleEn}</h3>
                                <p className="text-xs text-gray-500 font-medium">Request ID: {selectedRequest.id.split('-')[0].toUpperCase()}</p>
                            </div>
                            <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-bank-navy transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <Tag size={16} className="text-gray-400" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{selectedRequest.category}</span>
                                </div>
                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 text-gray-700 leading-relaxed font-medium">
                                    {selectedRequest.contentEn}
                                </div>
                            </div>

                            {/* RO Controls */}
                            {viewMode === 'RO' && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-bank-navy uppercase tracking-widest">Update Lifecycle</h4>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleUpdateStatus(selectedRequest.id, 'IN_PROGRESS')}
                                            className="flex-1 py-2 text-xs font-bold rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all"
                                        >
                                            Move to In-Progress
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(selectedRequest.id, 'RESOLVED')}
                                            className="flex-1 py-2 text-xs font-bold rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-all"
                                        >
                                            Mark as Resolved
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Comments Section */}
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center space-x-2">
                                    <MessageSquare size={14} />
                                    <span>Communication Log ({selectedRequest.comments.length})</span>
                                </h4>
                                <div className="space-y-3">
                                    {selectedRequest.comments.map(comment => (
                                        <div key={comment.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-bank-navy">{comment.user.fullNameEn}</span>
                                                <span className="text-[9px] text-gray-400 font-medium">{format(new Date(comment.createdAt), 'dd MMM, hh:mm')}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 leading-normal">{comment.content}</p>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={handleAddComment} className="relative mt-4">
                                    <input
                                        type="text"
                                        placeholder="Add a message or update..."
                                        className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-bank-navy text-xs transition-all"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                    />
                                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-bank-navy hover:scale-110 transition-all">
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper components for missing icons or imports
const RefreshCw = ({ className }: { className?: string }) => (
    <div className={className}>
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
    </div>
);

const XCircle = ({ size, className }: { size?: number, className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size || 24} height={size || 24}
        viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        className={className}
    >
        <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
    </svg>
);

export default RequestManager;
