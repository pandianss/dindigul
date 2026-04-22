import React from 'react';
import { MasterItem } from '../types';

interface ATMFormProps {
    formData: MasterItem;
    setFormData: (data: MasterItem) => void;
    branches: MasterItem[];
}

export const ATMForm: React.FC<ATMFormProps> = ({ 
    formData, 
    setFormData, 
    branches 
}) => {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">ATM ID (Unique)</label>
                <input
                    className="w-full p-2 border rounded font-mono"
                    value={formData.atmId || ''}
                    onChange={e => setFormData({ ...formData, atmId: e.target.value })}
                    required
                    placeholder="e.g. S1AC00123"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Branch Assignment</label>
                <select
                    className="w-full p-2 border rounded"
                    value={formData.branchId || ''}
                    onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                    required
                >
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.code} - {b.nameEn}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Current Balance (₹)</label>
                <input
                    type="number"
                    className="w-full p-2 border rounded"
                    value={formData.balance || 0}
                    onChange={e => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                    required
                />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Last Transaction Time</label>
                <input
                    className="w-full p-2 border rounded"
                    value={formData.lastTxnTime || ''}
                    onChange={e => setFormData({ ...formData, lastTxnTime: e.target.value })}
                    placeholder="e.g. 22-02-2026 14:30"
                />
            </div>
        </div>
    );
};
