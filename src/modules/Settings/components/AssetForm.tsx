import React from 'react';
import { MasterItem } from '../types';
import { CustomDatePicker } from '../../../components/CustomDatePicker';
import { formatLocalISO, parseLocalISO } from '../../../utils/dateUtils';

interface AssetFormProps {
    formData: MasterItem;
    setFormData: (data: MasterItem) => void;
    branches: MasterItem[];
}

export const AssetForm: React.FC<AssetFormProps> = ({ 
    formData, 
    setFormData, 
    branches 
}) => {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Category</label>
                <select
                    className="w-full p-2 border rounded"
                    value={formData.category || 'LOCKER'}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                    <option value="LOCKER">Locker Facility</option>
                    <option value="GENSET">Genset / Power Backup</option>
                    <option value="FURNITURE">Furniture & Fixtures</option>
                    <option value="MACHINERY">Office Machinery</option>
                    <option value="UPS">UPS System</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Asset Code</label>
                <input
                    className="w-full p-2 border rounded font-mono"
                    value={formData.assetCode || ''}
                    onChange={e => setFormData({ ...formData, assetCode: e.target.value })}
                    required
                    placeholder="e.g. RO/LOK/2026/01"
                />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Description</label>
                <input
                    className="w-full p-2 border rounded"
                    value={formData.description || ''}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    required
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Branch Assignment (SOL)</label>
                <select
                    className="w-full p-2 border rounded"
                    value={formData.branchId || ''}
                    onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                    required
                >
                    <option value="">Select Unit</option>
                    {branches.map(b => <option key={b.code} value={b.code}>{b.code} - {b.nameEn}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Purchase Date</label>
                <CustomDatePicker
                    selected={parseLocalISO(formData.purchaseDate as string)}
                    onChange={(date: Date | null) => setFormData({ ...formData, purchaseDate: formatLocalISO(date) })}
                    className="w-full p-2 border rounded"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Purchase Value (₹)</label>
                <input
                    type="number"
                    className="w-full p-2 border rounded"
                    value={formData.purchaseValue || 0}
                    onChange={e => setFormData({ ...formData, purchaseValue: parseFloat(e.target.value) || 0 })}
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">AMC Expiry</label>
                <CustomDatePicker
                    selected={parseLocalISO(formData.amcExpiry as string)}
                    onChange={(date: Date | null) => setFormData({ ...formData, amcExpiry: formatLocalISO(date) })}
                    className="w-full p-2 border rounded"
                />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Condition</label>
                <div className="flex gap-4">
                    {['GOOD', 'FAIR', 'POOR', 'SCRAP'].map(c => (
                        <label key={c} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="condition"
                                value={c}
                                checked={formData.condition === c}
                                onChange={() => setFormData({ ...formData, condition: c })}
                                className="accent-bank-teal"
                            />
                            <span className="text-xs font-bold text-bank-navy">{c}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};
