import React from 'react';
import { MasterItem } from '../types';

interface UnitFormProps {
    formData: MasterItem;
    setFormData: (data: MasterItem) => void;
    handleSpecialStatusChange: (status: string) => void;
}

export const UnitForm: React.FC<UnitFormProps> = ({ 
    formData, 
    setFormData, 
    handleSpecialStatusChange 
}) => {
    const isRO = formData.type === 'RO' || formData.type === 'Regional Office';

    return (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Unit Code</label>
                <input
                    className="w-full p-2 border rounded font-bold"
                    value={formData.code || ''}
                    onChange={e => {
                        const val = e.target.value;
                        const nextData = { ...formData, code: val };
                        // Auto-sync sorting ID if it hasn't been manually set differently
                        if (!formData.officeId || formData.officeId === 9999 || formData.officeId === 0) {
                            nextData.officeId = parseInt(val) || 0;
                        }
                        setFormData(nextData);
                    }}
                    required
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Office ID (Sorting)</label>
                <input
                    type="number"
                    className="w-full p-2 border rounded"
                    value={formData.officeId || ''}
                    onChange={e => setFormData({ ...formData, officeId: parseInt(e.target.value) || 0 })}
                    required
                />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Unit Open Date</label>
                <input
                    type="date"
                    className="w-full p-2 border rounded"
                    value={formData.openDate || ''}
                    onChange={e => setFormData({ ...formData, openDate: e.target.value })}
                />
            </div>

            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Unit Name (English)</label>
                <input
                    className="w-full p-2 border rounded"
                    value={formData.nameEn || ''}
                    onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                    required
                />
            </div>

            {/* Unit Type & Population Group */}
            <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider text-bank-navy">Unit Type</label>
                <select
                    className="w-full p-2 border rounded"
                    value={formData.type || 'BRANCH'}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                >
                    <option value="RO">Regional Office</option>
                    <option value="LPC">Loan Processing Centre</option>
                    <option value="BRANCH">Branch</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider text-bank-navy">Branch Size (Budgeting)</label>
                <select
                    className="w-full p-2 border rounded font-bold text-indigo-700 bg-indigo-50/30"
                    value={formData.size || ''}
                    onChange={e => setFormData({ ...formData, size: e.target.value })}
                >
                    <option value="">Not Categorized</option>
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                    <option value="Very Large">Very Large</option>
                    <option value="Extra Large">Extra Large</option>
                </select>
            </div>
            {!isRO && (
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider text-bank-navy">Population Group</label>
                    <select
                        className="w-full p-2 border rounded"
                        value={formData.populationGroup || 'URBAN'}
                        onChange={e => setFormData({ ...formData, populationGroup: e.target.value })}
                    >
                        <option value="METRO">Metro</option>
                        <option value="URBAN">Urban</option>
                        <option value="SEMI_URBAN">Semi-Urban</option>
                        <option value="RURAL">Rural</option>
                    </select>
                </div>
            )}

            {/* Special Status */}
            {!isRO && (
                <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider text-bank-navy">Special Status</label>
                    <div className="flex flex-wrap gap-3">
                        {['MSME', 'Agri', 'Retail', 'Captive', 'Specialised Retail', 'Forex', 'Large Corporate'].map(status => (
                            <label key={status} className="flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-md border border-gray-200 cursor-pointer hover:bg-gray-100">
                                <input
                                    type="checkbox"
                                    checked={(formData.specialStatus || []).includes(status)}
                                    onChange={() => handleSpecialStatusChange(status)}
                                    className="rounded text-bank-navy focus:ring-bank-navy"
                                />
                                <span className="text-sm font-medium text-gray-700">{status}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Risk Categorization */}
            {!isRO && (
                <>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider text-bank-navy">Risk Category</label>
                        <select
                            className="w-full p-2 border rounded font-bold text-gray-700"
                            value={formData.riskCategory || 'MEDIUM'}
                            onChange={e => setFormData({ ...formData, riskCategory: e.target.value })}
                        >
                            <option value="LOW">Low Risk</option>
                            <option value="MEDIUM">Medium Risk</option>
                            <option value="HIGH">High Risk</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider text-bank-navy">Risk Effective Date</label>
                        <div className="relative">
                            <input
                                type="date"
                                className="w-full p-2 border rounded"
                                value={formData.riskEffectiveDate?.toString().split('T')[0] || ''}
                                onChange={e => setFormData({ ...formData, riskEffectiveDate: e.target.value || undefined })}
                            />
                        </div>
                    </div>
                </>
            )}

            <div className="col-span-2 mt-2">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Unit Name (Tamil) - தமிழ்</label>
                        <input
                            className="w-full p-2 border rounded font-tamil"
                            value={formData.nameTa || ''}
                            onChange={e => setFormData({ ...formData, nameTa: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Unit Name (Hindi) - हिंदी</label>
                        <input
                            className="w-full p-2 border rounded font-hindi"
                            value={formData.nameHi || ''}
                            onChange={e => setFormData({ ...formData, nameHi: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider text-bank-navy">Address (English)</label>
                <textarea
                    className="w-full p-2 border rounded"
                    value={formData.address || ''}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider text-bank-navy">Address (Tamil) - தமிழ்</label>
                <textarea
                    className="w-full p-2 border rounded font-tamil"
                    value={formData.addressTa || ''}
                    onChange={e => setFormData({ ...formData, addressTa: e.target.value })}
                />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider text-bank-navy">Address (Hindi) - हिंदी</label>
                <textarea
                    className="w-full p-2 border rounded font-hindi"
                    value={formData.addressHi || ''}
                    onChange={e => setFormData({ ...formData, addressHi: e.target.value })}
                />
            </div>
            <div className="col-span-1">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider text-bank-navy">Phone</label>
                <input
                    className="w-full p-2 border rounded"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
            </div>
            <div className="col-span-1">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider text-bank-navy">Email</label>
                <input
                    className="w-full p-2 border rounded"
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
            </div>
        </div>
    );
};
