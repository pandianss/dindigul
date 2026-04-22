import React from 'react';
import { ArrowRightLeft, X } from 'lucide-react';
import { MasterItem } from '../types';

interface TransferModalProps {
    show: boolean;
    onClose: () => void;
    transferItem: MasterItem | null;
    transferData: { branchId: string; designationId: string; remarks: string };
    setTransferData: (data: { branchId: string; designationId: string; remarks: string }) => void;
    handleTransfer: (e: React.FormEvent) => void;
    branches: MasterItem[];
    designations: MasterItem[];
}

export const TransferModal: React.FC<TransferModalProps> = ({
    show,
    onClose,
    transferItem,
    transferData,
    setTransferData,
    handleTransfer,
    branches,
    designations
}) => {
    if (!show || !transferItem) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in duration-200 relative">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-bank-navy flex items-center gap-2">
                        <ArrowRightLeft size={24} className="text-bank-teal" />
                        <span>Transfer Staff</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500">
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
                            onClick={onClose}
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
        </div>
    );
};
