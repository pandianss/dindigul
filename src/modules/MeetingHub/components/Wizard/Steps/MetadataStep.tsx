import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Committee } from '../../../types';

interface MetadataStepProps {
    meetingTitle: string;
    setMeetingTitle: (t: string) => void;
    selectedCommitteeId: string | null;
    setSelectedCommitteeId: (id: string) => void;
    committees: Committee[];
}

export const MetadataStep: React.FC<MetadataStepProps> = ({
    meetingTitle,
    setMeetingTitle,
    selectedCommitteeId,
    setSelectedCommitteeId,
    committees
}) => {
    return (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-5">
            <div className="text-center">
                <div className="w-16 h-16 bg-bank-navy/5 text-bank-navy rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck size={32} />
                </div>
                <h3 className="text-xl font-black text-bank-navy uppercase tracking-tight">Step 2: Title & Category</h3>
                <p className="text-gray-400 text-sm mt-1">What is the focus of this meeting?</p>
            </div>
            <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2 px-1">Meeting Title / Subject</label>
                    <input 
                        type="text" 
                        value={meetingTitle} 
                        onChange={(e) => setMeetingTitle(e.target.value)} 
                        placeholder="e.g. Monthly Performance Review - Dindigul Region"
                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-bank-teal rounded-2xl font-bold text-bank-navy outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2 px-1">Committee Category</label>
                    <p className="text-[10px] text-gray-400 mb-3 px-1 italic">Committees help group recurring meetings (e.g. Regional Audit, Branch Review)</p>
                    <div className="relative">
                        <select 
                            value={selectedCommitteeId || 'GENERAL'} 
                            onChange={(e) => setSelectedCommitteeId(e.target.value)}
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-bank-teal rounded-2xl font-bold text-bank-navy outline-none transition-all appearance-none cursor-pointer"
                        >
                            <option value="GENERAL">General / Miscellaneous</option>
                            {committees.map(c => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                            <ShieldCheck size={16} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
