import React from 'react';
import { Users } from 'lucide-react';
import { MasterItem } from '../types';

interface StaffFormProps {
    formData: MasterItem;
    setFormData: (data: MasterItem) => void;
    editingItem: MasterItem | null;
    designations: MasterItem[];
    branches: MasterItem[];
    departments: MasterItem[];
    handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const StaffForm: React.FC<StaffFormProps> = ({ 
    formData, 
    setFormData, 
    editingItem, 
    designations, 
    branches, 
    departments,
    handlePhotoUpload
}) => {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Username / ID</label>
                <input
                    className="w-full p-2 border rounded bg-gray-50"
                    value={formData.username || ''}
                    readOnly={!!editingItem}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    required
                />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Staff Photo (Portrait 4:5)</label>
                <div className="flex items-center space-x-4">
                    <div className="w-24 h-30 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
                        {(formData.photoData || editingItem?.photo?.data) ? (
                            <img
                                src={(formData.photoData as string) || editingItem?.photo?.data}
                                alt="Preview"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Users className="text-gray-300" size={32} />
                        )}
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-bank-navy/10 file:text-bank-navy hover:file:bg-bank-navy/20 cursor-pointer"
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Full Name (English)</label>
                <input
                    className="w-full p-2 border rounded"
                    value={formData.fullNameEn || ''}
                    onChange={e => setFormData({ ...formData, fullNameEn: e.target.value })}
                    required
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Designation Override (English)</label>
                <input
                    className="w-full p-2 border rounded"
                    value={formData.designationEn || ''}
                    onChange={e => setFormData({ ...formData, designationEn: e.target.value })}
                    placeholder="e.g. Senior Regional Manager"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Gender</label>
                <select
                    className="w-full p-2 border rounded"
                    value={formData.gender || 'M'}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                </select>
            </div>

            {/* Organizational Details */}
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Designation</label>
                <select
                    className="w-full p-2 border rounded"
                    value={formData.designationId || ''}
                    onChange={e => setFormData({ ...formData, designationId: e.target.value })}
                >
                    <option value="">Select Designation</option>
                    {designations.map(d => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Grade</label>
                <input
                    className="w-full p-2 border rounded"
                    value={formData.grade || ''}
                    onChange={e => setFormData({ ...formData, grade: e.target.value })}
                    placeholder="e.g. SCALE-I, CLERK"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Branch / Unit</label>
                <select
                    className="w-full p-2 border rounded"
                    value={formData.branchId || ''}
                    onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                >
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b.code} value={b.code}>{b.code} - {b.nameEn}</option>)}
                </select>
            </div>
            {['RO_USER', 'ADMIN'].includes(formData.role || '') && (
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Department</label>
                    <select
                        className="w-full p-2 border rounded"
                        value={formData.departmentId || ''}
                        onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                    >
                        <option value="">Select Department</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
                    </select>
                </div>
            )}

            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">System Role</label>
                <select
                    className="w-full p-2 border rounded"
                    value={formData.role || 'BRANCH_USER'}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                >
                    <option value="ADMIN">System Admin</option>
                    <option value="RO_USER">Regional Office User</option>
                    <option value="BRANCH_USER">Branch User</option>
                    <option value="LPC_USER">Loan Processing Centre User</option>
                </select>
            </div>

            {/* Hierarchy Controls */}
            <div className="col-span-2 space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-bank-navy uppercase tracking-wider">Hierarchy & Leadership</h4>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded text-bank-teal"
                            checked={formData.isUnitHead || false}
                            onChange={e => setFormData({ ...formData, isUnitHead: e.target.checked })}
                        />
                        <span className="text-sm font-bold text-gray-700">Set as Head of Unit</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded text-bank-teal"
                            checked={formData.isSecondLine || false}
                            onChange={e => setFormData({ ...formData, isSecondLine: e.target.checked })}
                        />
                        <span className="text-sm font-bold text-gray-700">Set as 2nd Line</span>
                    </label>
                </div>

                {['RO_USER', 'ADMIN'].includes(formData.role || '') && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">Assigned Departments</label>
                            <div className="max-h-32 overflow-y-auto border rounded bg-white p-2">
                                {departments.map(d => (
                                    <label key={`dept-${d.id}`} className="flex items-center space-x-2 mb-1 cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={(formData.departmentIds || []).includes(d.id!)}
                                            onChange={e => {
                                                const current = formData.departmentIds || [];
                                                if (e.target.checked) setFormData({ ...formData, departmentIds: [...current, d.id!] });
                                                else setFormData({ ...formData, departmentIds: current.filter(id => id !== d.id) });
                                            }}
                                        />
                                        <span className="text-xs">{d.nameEn}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">Headed Departments</label>
                            <div className="max-h-32 overflow-y-auto border rounded bg-white p-2">
                                {departments.map(d => (
                                    <label key={`headed-${d.id}`} className="flex items-center space-x-2 mb-1 cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={(formData.managedDepartmentIds || []).includes(d.id!)}
                                            onChange={e => {
                                                const current = formData.managedDepartmentIds || [];
                                                if (e.target.checked) setFormData({ ...formData, managedDepartmentIds: [...current, d.id!] });
                                                else setFormData({ ...formData, managedDepartmentIds: current.filter(id => id !== d.id) });
                                            }}
                                        />
                                        <span className="text-xs font-bold text-bank-teal">{d.nameEn}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="col-span-1">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Full Name (Tamil) - தமிழ்</label>
                <input
                    className="w-full p-2 border rounded font-tamil"
                    value={formData.fullNameTa || ''}
                    onChange={e => setFormData({ ...formData, fullNameTa: e.target.value })}
                />
            </div>
            <div className="col-span-1">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Designation (Tamil) - தமிழ்</label>
                <input
                    className="w-full p-2 border rounded font-tamil"
                    value={formData.designationTa || ''}
                    onChange={e => setFormData({ ...formData, designationTa: e.target.value })}
                />
            </div>
            <div className="col-span-1">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Full Name (Hindi) - हिंदी</label>
                <input
                    className="w-full p-2 border rounded font-hindi"
                    value={formData.fullNameHi || ''}
                    onChange={e => setFormData({ ...formData, fullNameHi: e.target.value })}
                />
            </div>
            <div className="col-span-1">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Designation (Hindi) - हिंदी</label>
                <input
                    className="w-full p-2 border rounded font-hindi"
                    value={formData.designationHi || ''}
                    onChange={e => setFormData({ ...formData, designationHi: e.target.value })}
                />
            </div>
        </div>
    );
};
