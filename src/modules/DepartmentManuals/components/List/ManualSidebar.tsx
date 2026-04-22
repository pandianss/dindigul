import React from 'react';
import { BookOpen, List as ListIcon, Calendar, Globe, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Manual } from '../../types';
import { cn } from '../../../../utils/cn';

interface ManualSidebarProps {
    manuals: Manual[];
    selectedManualId: string | undefined;
    onSelect: (manual: Manual) => void;
}

export const ManualSidebar: React.FC<ManualSidebarProps> = ({
    manuals,
    selectedManualId,
    onSelect
}) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Available Guides</h3>
                <span className="text-[10px] font-black bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full">{manuals.length}</span>
            </div>
            
            <div className="space-y-3">
                {manuals.map(manual => (
                    <button
                        key={manual.id}
                        onClick={() => onSelect(manual)}
                        className={cn(
                            "w-full text-left p-5 rounded-[2rem] border transition-all duration-300 group relative overflow-hidden",
                            selectedManualId === manual.id 
                                ? "bg-bank-navy border-bank-navy shadow-xl shadow-bank-navy/20" 
                                : "bg-white border-gray-100 hover:border-bank-teal/40 hover:shadow-lg hover:-translate-y-1"
                        )}
                    >
                        <div className="flex items-start justify-between mb-3 relative z-10">
                            <div className={cn(
                                "w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                                selectedManualId === manual.id ? "bg-white/10 text-bank-gold" : "bg-gray-50 text-bank-navy"
                            )}>
                                <BookOpen size={20} />
                            </div>
                            <div className={cn(
                                "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider border",
                                selectedManualId === manual.id ? "text-bank-gold border-bank-gold/30" : "text-bank-teal border-bank-teal/20 bg-bank-teal/5"
                            )}>
                                {manual.department?.code || 'DEP'}
                            </div>
                        </div>
                        
                        <h4 className={cn(
                            "font-black text-base tracking-tight mb-2 relative z-10",
                            selectedManualId === manual.id ? "text-white" : "text-bank-navy"
                        )}>
                            {manual.titleEn}
                        </h4>
                        
                        <div className="flex items-center gap-4 relative z-10">
                            <div className={cn(
                                "flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest opacity-60",
                                selectedManualId === manual.id ? "text-white" : "text-gray-400"
                            )}>
                                <ListIcon size={12} />
                                {manual.activities.length} Steps
                            </div>
                            <div className={cn(
                                "flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest opacity-60",
                                selectedManualId === manual.id ? "text-white" : "text-gray-400"
                            )}>
                                <Calendar size={12} />
                                {format(new Date(manual.updatedAt), 'MMM dd')}
                            </div>
                        </div>

                        {selectedManualId === manual.id && (
                            <div className="absolute -bottom-4 -right-4 text-white/5 rotate-12">
                                <Globe size={120} />
                            </div>
                        )}
                    </button>
                ))}
                
                {manuals.length === 0 && (
                    <div className="text-center py-12 bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200">
                        <AlertCircle className="mx-auto text-gray-300 mb-2" size={32} />
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No manuals found</p>
                    </div>
                )}
            </div>
        </div>
    );
};
