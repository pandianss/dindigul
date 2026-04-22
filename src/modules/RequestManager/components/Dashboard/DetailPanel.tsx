import React from 'react';
import { format } from 'date-fns';
import { Tag, XCircle, MessageSquare, Send } from 'lucide-react';
import { BranchRequest } from '../../types';

interface DetailPanelProps {
    req: BranchRequest;
    onClose: () => void;
    viewMode: 'BRANCH' | 'RO';
    onUpdateStatus: (id: string, status: string) => void;
    onAddComment: (comment: string) => void;
    newComment: string;
    setNewComment: (c: string) => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
    req,
    onClose,
    viewMode,
    onUpdateStatus,
    onAddComment,
    newComment,
    setNewComment
}) => {
    return (
        <div className="w-1/2 overflow-hidden flex flex-col card p-0 bg-white shadow-2xl animate-in slide-in-from-right duration-300 border-l border-bank-navy/10 rounded-3xl">
            <div className="p-6 border-b shrink-0 flex items-center justify-between bg-gray-50/50">
                <div>
                    <h3 className="font-bold text-bank-navy text-xl">{req.titleEn}</h3>
                    <p className="text-xs text-gray-500 font-medium">Request ID: {req.id.split('-')[0].toUpperCase()}</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-bank-navy transition-colors">
                    <XCircle size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                        <Tag size={16} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{req.category}</span>
                    </div>
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 text-gray-700 leading-relaxed font-medium">
                        {req.contentEn}
                    </div>
                    {req.category === 'GL_HEAD_ACTIVATION' && req.contentJson && (
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            {Object.entries(req.contentJson).map(([key, val]) => (
                                <div key={key} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">
                                        {key.replace('gl', '').replace(/([A-Z])/g, ' $1')}
                                    </p>
                                    <p className="text-xs font-bold text-bank-navy">{String(val)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* RO Controls */}
                {viewMode === 'RO' && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-bank-navy uppercase tracking-widest">Update Lifecycle</h4>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onUpdateStatus(req.id, 'IN_PROGRESS')}
                                className="flex-1 py-2 text-xs font-bold rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all"
                            >
                                Move to In-Progress
                            </button>
                            <button
                                onClick={() => onUpdateStatus(req.id, 'RESOLVED')}
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
                        <span>Communication Log ({req.comments.length})</span>
                    </h4>
                    <div className="space-y-3">
                        {req.comments.map(comment => (
                            <div key={comment.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-bank-navy">{comment.user.fullNameEn}</span>
                                    <span className="text-[9px] text-gray-400 font-medium">{format(new Date(comment.createdAt), 'dd MMM, hh:mm')}</span>
                                </div>
                                <p className="text-xs text-gray-600 leading-normal">{comment.content}</p>
                            </div>
                        ))}
                    </div>
                    <form 
                        onSubmit={(e) => { e.preventDefault(); onAddComment(newComment); }} 
                        className="relative mt-4"
                    >
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
    );
};
