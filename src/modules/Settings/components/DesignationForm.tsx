import React from 'react';
import { MasterItem } from '../types';

interface DesignationFormProps {
    formData: MasterItem;
    setFormData: (data: MasterItem) => void;
}

export const DesignationForm: React.FC<DesignationFormProps> = ({ 
    formData, 
    setFormData 
}) => {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Code</label>
                <input
                    className="w-full p-2 border rounded"
                    value={formData.code || ''}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    required
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Work ID (Sorting)</label>
                <input
                    type="number"
                    className="w-full p-2 border rounded"
                    value={formData.workId || ''}
                    onChange={e => setFormData({ ...formData, workId: parseInt(e.target.value) || 0 })}
                    required
                />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Title (English)</label>
                <input
                    className="w-full p-2 border rounded"
                    value={formData.nameEn || ''}
                    onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                    required
                />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Title (Tamil) - தமிழ்</label>
                <input
                    className="w-full p-2 border rounded font-tamil"
                    value={formData.nameTa || ''}
                    onChange={e => setFormData({ ...formData, nameTa: e.target.value })}
                />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Title (Hindi) - हिंदी</label>
                <input
                    className="w-full p-2 border rounded font-hindi"
                    value={formData.nameHi || ''}
                    onChange={e => setFormData({ ...formData, nameHi: e.target.value })}
                />
            </div>
        </div>
    );
};
