import React from 'react';
import { MasterItem } from '../types';

interface LockerFormProps {
    formData: MasterItem;
    setFormData: (data: MasterItem) => void;
    branches: MasterItem[];
}

const LOCKER_SPECS: Record<string, { category: string; size: string }> = {
    'Type-A': { category: 'Small', size: '539' },
    'Type-B': { category: 'Small', size: '858' },
    'Type-C': { category: 'Small', size: '1186' },
    'Type-D': { category: 'Small', size: '1337' },
    'Type-H1': { category: 'Small', size: '1828' },
    'Type-E': { category: 'Small', size: '1872' },
    'Type-F': { category: 'Medium', size: '2767' },
    'Type-G': { category: 'Medium', size: '2843' },
    'Type-H': { category: 'Medium', size: '3986' },
    'Type-L1': { category: 'Large', size: '4671' },
    'Type-K': { category: 'Large', size: '6412' },
    'Type-L2': { category: 'Large', size: '6117' },
    'Type-L': { category: 'Large', size: '6296' },
};

export const LockerForm: React.FC<LockerFormProps> = ({ 
    formData, 
    setFormData, 
    branches 
}) => {
    const handleTypeChange = (type: string) => {
        const spec = LOCKER_SPECS[type];
        setFormData({ 
            ...formData, 
            type, 
            category: spec?.category || '',
            size: spec?.size || ''
        });
    };

    return (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Locker Number</label>
                <input
                    className="w-full p-2 border rounded font-mono"
                    value={formData.lockerNo || ''}
                    onChange={e => setFormData({ ...formData, lockerNo: e.target.value })}
                    required
                    placeholder="e.g. 123"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Locker Type</label>
                <select
                    className="w-full p-2 border rounded"
                    value={formData.type || ''}
                    onChange={e => handleTypeChange(e.target.value)}
                    required
                >
                    <option value="">Select Type</option>
                    {Object.keys(LOCKER_SPECS).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Category (Auto)</label>
                <input
                    className="w-full p-2 border rounded bg-gray-50 font-bold text-bank-navy"
                    value={formData.category || ''}
                    readOnly
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Approx Size (cu. in.)</label>
                <input
                    className="w-full p-2 border rounded bg-gray-50"
                    value={formData.size || ''}
                    readOnly
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
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Occupancy Status</label>
                <div className="flex gap-4 p-2 bg-gray-50 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="status"
                            value="AVAILABLE"
                            checked={formData.status === 'AVAILABLE'}
                            onChange={() => setFormData({ ...formData, status: 'AVAILABLE' })}
                            className="accent-green-500"
                        />
                        <span className="text-xs font-bold text-green-700">Available</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="status"
                            value="LET_OUT"
                            checked={formData.status === 'LET_OUT'}
                            onChange={() => setFormData({ ...formData, status: 'LET_OUT' })}
                            className="accent-orange-500"
                        />
                        <span className="text-xs font-bold text-orange-700">Let Out</span>
                    </label>
                </div>
            </div>
        </div>
    );
};
