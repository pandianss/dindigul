import React from 'react';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { Committee } from '../../types';
import { cn } from '../../../../utils/cn';

interface CommitteeSidebarProps {
    committees: Committee[];
    selectedCommitteeId: string | null;
    onSelect: (id: string) => void;
}

export const CommitteeSidebar: React.FC<CommitteeSidebarProps> = ({
    committees,
    selectedCommitteeId,
    onSelect
}) => {
    return (
        <div className="w-72 border-r border-gray-200/50 bg-white flex flex-col p-6">
            <div className="flex items-center gap-2 mb-8">
                <div className="p-2 bg-bank-navy rounded-xl text-white">
                    <ShieldCheck size={20} />
                </div>
                <h2 className="text-sm font-black text-bank-navy uppercase tracking-widest">Committees</h2>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                <button
                    onClick={() => onSelect('GENERAL')}
                    className={cn(
                        "w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center justify-between group",
                        selectedCommitteeId === 'GENERAL' 
                            ? "bg-bank-navy text-white shadow-lg" 
                            : "hover:bg-bank-navy/5 text-gray-500 hover:text-bank-navy"
                    )}
                >
                    <span className="text-[13px] font-bold">General Meetings</span>
                    <ChevronRight size={14} className={cn("shrink-0", selectedCommitteeId === 'GENERAL' ? "text-white" : "text-gray-300")} />
                </button>

                <div className="h-px bg-gray-100 my-4 mx-2" />

                {committees.map(c => (
                    <button
                        key={c.id}
                        onClick={() => onSelect(c.id)}
                        className={cn(
                            "w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center justify-between group",
                            selectedCommitteeId === c.id 
                                ? "bg-bank-navy text-white shadow-lg" 
                                : "hover:bg-bank-navy/5 text-gray-500 hover:text-bank-navy"
                        )}
                    >
                        <span className="text-[13px] font-bold truncate pr-2">{c.nameEn}</span>
                        <ChevronRight size={14} className={cn("shrink-0", selectedCommitteeId === c.id ? "text-white" : "text-gray-300")} />
                    </button>
                ))}
            </div>
        </div>
    );
};
