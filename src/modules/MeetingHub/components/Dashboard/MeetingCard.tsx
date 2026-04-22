import React from 'react';
import { Pencil, Printer, Clock, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Meeting } from '../../types';

interface MeetingCardProps {
    meeting: Meeting;
    onEdit: (m: Meeting) => void;
    onDownload: (id: string, name: string) => void;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({
    meeting,
    onEdit,
    onDownload
}) => {
    const attendees = meeting.attendees || [];
    
    return (
        <div className="card p-6 bg-white hover:shadow-2xl transition-all border-gray-100 group">
            <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gray-50 rounded-2xl text-bank-navy font-black text-xs group-hover:bg-bank-navy group-hover:text-white transition-colors uppercase tracking-widest">
                    {format(new Date(meeting.date), 'dd.MM.yy')}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => onEdit(meeting)} 
                        className="p-2 hover:bg-bank-navy/5 text-gray-400 hover:text-bank-navy rounded-lg transition-colors"
                    >
                        <Pencil size={14} />
                    </button>
                    <button 
                        onClick={() => onDownload(meeting.id, meeting.committee?.nameEn || meeting.title || 'Meeting')} 
                        className="p-2 hover:bg-bank-navy/5 text-gray-400 hover:text-bank-navy rounded-lg transition-colors"
                    >
                        <Printer size={14} />
                    </button>
                </div>
            </div>
            
            <h4 className="font-black text-bank-navy uppercase text-sm mb-2">
                {meeting.committee?.nameEn || meeting.title || 'General Meeting'}
            </h4>
            
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                <Clock size={12} />
                <span>Venue: {meeting.venue}</span>
            </div>
            
            <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                <div className="flex -space-x-2">
                    {attendees.slice(0, 3).map((_, i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-bank-teal/20 border-2 border-white flex items-center justify-center text-[10px] font-black text-bank-teal">M</div>
                    ))}
                    {attendees.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-gray-500">
                            +{attendees.length - 3}
                        </div>
                    )}
                </div>
                <span className="text-[10px] font-black uppercase text-bank-teal bg-bank-teal/5 px-3 py-1.5 rounded-full">Finalized</span>
            </div>
        </div>
    );
};
