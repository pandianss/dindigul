import React from 'react';
import { Plus, Users } from 'lucide-react';
import { Meeting } from '../../types';
import { MeetingCard } from './MeetingCard';

interface MeetingsListProps {
    meetings: Meeting[];
    isLoading: boolean;
    onNewMeeting: () => void;
    onEditMeeting: (m: Meeting) => void;
    onDownloadPDF: (id: string, name: string) => void;
}

export const MeetingsList: React.FC<MeetingsListProps> = ({
    meetings,
    isLoading,
    onNewMeeting,
    onEditMeeting,
    onDownloadPDF
}) => {
    return (
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-bank-navy uppercase tracking-tight">Meeting Dashboard</h1>
                    <p className="text-gray-400 text-sm mt-1">Review and manage official committee records</p>
                </div>
                <button 
                    onClick={onNewMeeting}
                    className="flex items-center gap-2 px-6 py-3 bg-bank-navy text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-bank-navy/90 transition-all shadow-xl shadow-bank-navy/20"
                >
                    <Plus size={16} /> New Meeting
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-bank-teal/20 border-t-bank-teal rounded-full animate-spin mb-4" />
                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Retrieving Minutes...</p>
                </div>
            ) : meetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                    <Users size={40} className="text-gray-300 mb-4" />
                    <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs">No Meetings Recorded</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {meetings.map(m => (
                        <MeetingCard 
                            key={m.id} 
                            meeting={m} 
                            onEdit={onEditMeeting} 
                            onDownload={onDownloadPDF} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
