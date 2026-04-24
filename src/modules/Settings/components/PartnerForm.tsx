import React from 'react';
import { MasterItem } from '../types';

interface PartnerFormProps {
    formData: MasterItem;
    setFormData: (data: MasterItem) => void;
    branches: MasterItem[];
}

export const PartnerForm: React.FC<PartnerFormProps> = ({ 
    formData, 
    setFormData, 
    branches 
}) => {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Partner Type</label>
                <select
                    className="w-full p-2 border rounded"
                    value={formData.type || 'JEWEL_APPRAISER'}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                >
                    <option value="JEWEL_APPRAISER">Jewel Appraiser</option>
                    <option value="BC_INDIVIDUAL">Individual BC</option>
                    <option value="BC_CORPORATE">Corporate BC</option>
                </select>
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Full Name (English)</label>
                <input
                    className="w-full p-2 border rounded"
                    value={formData.nameEn || ''}
                    onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                    required
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Full Name (Tamil)</label>
                <input
                    className="w-full p-2 border rounded font-tamil"
                    value={formData.nameTa || ''}
                    onChange={e => setFormData({ ...formData, nameTa: e.target.value })}
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Full Name (Hindi)</label>
                <input
                    className="w-full p-2 border rounded font-hindi"
                    value={formData.nameHi || ''}
                    onChange={e => setFormData({ ...formData, nameHi: e.target.value })}
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Registration / IBA No</label>
                <input
                    className="w-full p-2 border rounded font-mono"
                    value={formData.registrationNo || ''}
                    onChange={e => setFormData({ ...formData, registrationNo: e.target.value })}
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
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Phone</label>
                <input
                    className="w-full p-2 border rounded"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Email</label>
                <input
                    type="email"
                    className="w-full p-2 border rounded"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
            </div>
        </div>
    );
};
