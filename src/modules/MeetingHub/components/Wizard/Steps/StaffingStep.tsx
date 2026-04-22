import React from 'react';
import { Users, X } from 'lucide-react';
import { User } from '../../../types';

interface StaffingStepProps {
    users: User[];
    selectedSignatories: string[];
    setSelectedSignatories: (ids: string[] | ((prev: string[]) => string[])) => void;
    selectedAttendees: string[]; // Absentee IDs
    setSelectedAttendees: (ids: string[] | ((prev: string[]) => string[])) => void;
    participantDescription: string;
    setParticipantDescription: (val: string) => void;
}

export const StaffingStep: React.FC<StaffingStepProps> = ({
    users,
    selectedSignatories,
    setSelectedSignatories,
    selectedAttendees,
    setSelectedAttendees,
    participantDescription,
    setParticipantDescription
}) => {
    return (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-2xl space-y-10 animate-in fade-in slide-in-from-bottom-5">
            <div className="text-center">
                <div className="w-16 h-16 bg-bank-navy/5 text-bank-navy rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users size={32} />
                </div>
                <h3 className="text-xl font-black text-bank-navy uppercase tracking-tight">Step 5: Participants & Signatories</h3>
                <p className="text-gray-400 text-sm mt-1">Describe who joined the meeting and record any absentees</p>
            </div>

            <div className="space-y-8">
                {/* Participant Narrative */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-bank-navy tracking-[0.2em] mb-2 block px-1">1. Meeting Participants (Typed-in Details)</label>
                    <textarea 
                        value={participantDescription}
                        onChange={(e) => setParticipantDescription(e.target.value)}
                        placeholder="e.g. SRM Address to all Branch Heads, 2nd Line Officers and Regional Office Staff..."
                        rows={3}
                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-bank-teal rounded-2xl font-bold text-bank-navy outline-none transition-all resize-none"
                    />
                </div>

                {/* Signatories Selector */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-bank-navy tracking-[0.2em] mb-2 block px-1">2. Signatories (Who will confirm the minutes)</label>
                    <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-2xl min-h-[50px] border border-transparent focus-within:border-bank-navy/10 transition-colors">
                        {selectedSignatories.map(sid => (
                            <div key={sid} className="px-3 py-1.5 bg-bank-navy text-white rounded-full flex items-center gap-2 text-[10px] font-bold animate-in zoom-in-90">
                                {users.find(u => u.id === sid)?.fullNameEn}
                                <button type="button" onClick={() => setSelectedSignatories(prev => prev.filter(id => id !== sid))} className="hover:text-red-300 transition-colors">
                                    <X size={12}/>
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="relative">
                        <select 
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val && !selectedSignatories.includes(val)) setSelectedSignatories(p => [...p, val]);
                                e.target.value = '';
                            }}
                            className="w-full px-6 py-4 bg-gray-100 border-2 border-transparent focus:border-bank-teal rounded-2xl font-bold text-bank-navy outline-none transition-all cursor-pointer appearance-none"
                        >
                            <option value="">Select Signatory...</option>
                            {users
                                .filter(u => (u.role === 'ADMIN' || u.role === 'RO_MANAGER' || u.role === 'RO_USER'))
                                .filter(u => !selectedSignatories.includes(u.id) && !selectedAttendees.includes(u.id))
                                .map(u => (
                                    <option key={u.id} value={u.id}>{u.fullNameEn} ({u.designationEn || u.role})</option>
                                ))}
                        </select>
                    </div>
                </div>

                {/* Absentees Selector */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] mb-2 block px-1">3. Leave of Absence / Absentees (Select Individuals)</label>
                    <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-2xl min-h-[50px] border border-transparent focus-within:border-gray-200 transition-colors">
                        {selectedAttendees.map(aid => (
                            <div key={aid} className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-full flex items-center gap-2 text-[10px] font-bold animate-in zoom-in-90">
                                {users.find(u => u.id === aid)?.fullNameEn}
                                <button type="button" onClick={() => setSelectedAttendees(prev => prev.filter(id => id !== aid))} className="hover:text-red-500 transition-colors">
                                    <X size={12}/>
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="relative">
                        <select 
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val && !selectedAttendees.includes(val)) setSelectedAttendees(p => [...p, val]);
                                e.target.value = '';
                            }}
                            className="w-full px-6 py-4 bg-gray-100 border-2 border-transparent focus:border-bank-teal rounded-2xl font-bold text-bank-navy outline-none transition-all cursor-pointer appearance-none"
                        >
                            <option value="">Select Absentee...</option>
                            {users
                                .filter(u => !selectedSignatories.includes(u.id) && !selectedAttendees.includes(u.id))
                                .map(u => (
                                    <option key={u.id} value={u.id}>{u.fullNameEn} ({u.designationEn || u.role})</option>
                                ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};
