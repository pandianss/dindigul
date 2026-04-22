import React from 'react';
import { Building2, Upload, Plus, X } from 'lucide-react';
import { MasterItem } from '../types';

interface DepartmentFormProps {
    formData: MasterItem;
    setFormData: (data: MasterItem) => void;
    handleSealUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    uploadingSeal: boolean;
}

export const DepartmentForm: React.FC<DepartmentFormProps> = ({ 
    formData, 
    setFormData, 
    handleSealUpload, 
    uploadingSeal 
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
            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Name (English)</label>
                <input
                    className="w-full p-2 border rounded"
                    value={formData.nameEn || ''}
                    onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                    required
                />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Name (Tamil) - தமிழ்</label>
                <input
                    className="w-full p-2 border rounded font-tamil"
                    value={formData.nameTa || ''}
                    onChange={e => setFormData({ ...formData, nameTa: e.target.value })}
                />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Name (Hindi) - हिंदी</label>
                <input
                    className="w-full p-2 border rounded font-hindi"
                    value={formData.nameHi || ''}
                    onChange={e => setFormData({ ...formData, nameHi: e.target.value })}
                />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-bold text-bank-navy mb-2 uppercase tracking-wider">Departmental Seal (Vector/PNG Support)</label>
                <div className="flex items-center space-x-4 bg-bank-teal/5 p-4 rounded-xl border border-bank-teal/20">
                    <div className="w-16 h-16 bg-white rounded-lg border flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                        {formData.sealPath ? (
                            <img src={`/${formData.sealPath}`} alt="Seal Preview" className="max-w-full max-h-full object-contain" />
                        ) : (
                            <Building2 className="text-gray-200" size={32} />
                        )}
                    </div>
                    <div className="flex-1">
                        <input 
                            type="file" 
                            id="seal-upload" 
                            className="hidden" 
                            accept=".png,.jpg,.jpeg,.svg"
                            onChange={handleSealUpload}
                        />
                        <label 
                            htmlFor="seal-upload" 
                            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-sm cursor-pointer transition-all ${
                                uploadingSeal ? 'bg-gray-100 text-gray-400' : 'bg-bank-teal text-white hover:bg-bank-navy'
                            }`}
                        >
                            <Upload size={16} />
                            <span>{uploadingSeal ? 'Uploading...' : 'Upload New Seal'}</span>
                        </label>
                        <div className="mt-2 flex items-center space-x-2">
                            <span className="text-[10px] font-mono text-gray-400">Path: {formData.sealPath || 'No seal uploaded'}</span>
                            {formData.sealPath && (
                                <button 
                                    type="button"
                                    onClick={() => setFormData({ ...formData, sealPath: '' })}
                                    className="text-red-400 hover:text-red-600 p-1"
                                    title="Remove Seal"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 italic flex items-center">
                    <Plus size={10} className="mr-1" /> Best results with SVG or transparent PNG.
                </p>
            </div>
        </div>
    );
};
