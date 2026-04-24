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
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Device Type</label>
                <select
                    className="w-full p-2 border rounded"
                    value={formData.deviceType || 'ATM'}
                    onChange={e => setFormData({ ...formData, deviceType: e.target.value })}
                >
                    <option value="ATM">ATM (Teller Machine)</option>
                    <option value="CDM">CDM (Cash Deposit/Recycler)</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Management Model</label>
                <select
                    className="w-full p-2 border rounded"
                    value={formData.managementType || 'BRANCH_MANAGED'}
                    onChange={e => setFormData({ ...formData, managementType: e.target.value })}
                >
                    <option value="BRANCH_MANAGED">Branch Managed</option>
                    <option value="OUTSOURCED">Outsourced (Managed Service)</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Location Type</label>
                <select
                    className="w-full p-2 border rounded"
                    value={formData.locationType || 'ONSITE'}
                    onChange={e => setFormData({ ...formData, locationType: e.target.value })}
                >
                    <option value="ONSITE">Onsite (Inside Branch)</option>
                    <option value="OFFSITE">Offsite (Standalone)</option>
                </select>
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
                    {branches.map(b => <option key={b.code} value={b.code}>{b.code} - {b.nameEn}</option>)}
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
            <div>
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
