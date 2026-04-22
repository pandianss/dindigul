import React from 'react';
import { Calendar } from 'lucide-react';

interface DateStepProps {
    date: string;
    setDate: (d: string) => void;
}

export const DateStep: React.FC<DateStepProps> = ({ date, setDate }) => {
    return (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-5">
            <div className="text-center">
                <div className="w-16 h-16 bg-bank-navy/5 text-bank-navy rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Calendar size={32} />
                </div>
                <h3 className="text-xl font-black text-bank-navy uppercase tracking-tight">Step 1: Meeting Date</h3>
                <p className="text-gray-400 text-sm mt-1">Select the official date for the minutes record</p>
            </div>
            <div className="max-w-xs mx-auto">
                <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-bank-teal rounded-2xl font-black text-lg text-bank-navy outline-none transition-all text-center"
                />
            </div>
        </div>
    );
};
