import React from 'react';
import { Globe, X, Edit2, Trash2, List as ListIcon, FileText, Plus } from 'lucide-react';
import { Manual } from '../../types';

interface ManualHeaderProps {
    manual: Manual;
    onClose: () => void;
    isAuthorized: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onViewProfessional: () => void;
    onAddActivity: () => void;
    userDeptId?: string;
    userRole?: string;
}

export const ManualHeader: React.FC<ManualHeaderProps> = ({
    manual,
    onClose,
    isAuthorized,
    onEdit,
    onDelete,
    onViewProfessional,
    onAddActivity,
    userDeptId,
    userRole
}) => {
    const canManageManual = isAuthorized && (manual.departmentId === userDeptId || userRole === 'ADMIN');

    return (
        <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <Globe size={180} className="text-bank-navy" />
            </div>
            
            <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                    <button 
                        onClick={onClose}
                        className="lg:hidden p-2 text-gray-400 hover:text-bank-navy mb-4 -ml-2"
                    >
                        <X size={24} />
                    </button>
                    
                    {canManageManual && (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={onEdit}
                                className="p-2.5 text-gray-400 hover:text-bank-teal hover:bg-bank-teal/5 rounded-2xl transition-all"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button 
                                onClick={onDelete}
                                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="mb-8">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <h2 className="text-3xl font-black text-bank-navy tracking-tight">{manual.titleEn}</h2>
                        <div className="px-3 py-1 bg-bank-navy text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-md">
                            {manual.department?.nameEn}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6 mt-3">
                        {manual.titleTa && <p className="font-tamil text-bank-teal text-lg leading-none">{manual.titleTa}</p>}
                        {manual.titleHi && <p className="font-hindi text-bank-gold text-lg leading-none">{manual.titleHi}</p>}
                    </div>
                    
                    {manual.description && (
                        <div 
                            className="text-gray-500 text-sm leading-relaxed max-w-2xl mt-4 font-medium quill-content"
                            dangerouslySetInnerHTML={{ __html: manual.description }}
                        />
                    )}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                    <h3 className="text-xs font-black text-bank-navy uppercase tracking-widest flex items-center gap-2">
                        <ListIcon size={14} className="text-bank-gold" />
                        Operational Activities
                    </h3>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={onViewProfessional}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-bank-navy rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-gray-50 shadow-sm transition-all active:scale-95"
                        >
                            <FileText size={14} className="text-bank-teal" />
                            View as Document
                        </button>
                        
                        {canManageManual && (
                            <button 
                                onClick={onAddActivity}
                                className="flex items-center gap-2 px-4 py-2 bg-bank-teal text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-opacity-90 shadow-lg shadow-bank-teal/20 transition-all active:scale-95"
                            >
                                <Plus size={14} />
                                Add Activity
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
