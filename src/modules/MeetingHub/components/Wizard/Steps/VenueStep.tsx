import React from 'react';
import { Clock } from 'lucide-react';

interface VenueStepProps {
    venue: string;
    setVenue: (v: string) => void;
}

export const VenueStep: React.FC<VenueStepProps> = ({ venue, setVenue }) => {
    return (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-5">
            <div className="text-center">
                <div className="w-16 h-16 bg-bank-navy/5 text-bank-navy rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Clock size={32} />
                </div>
                <h3 className="text-xl font-black text-bank-navy uppercase tracking-tight">Step 3: Location / Venue</h3>
                <p className="text-gray-400 text-sm mt-1">Where was the meeting held?</p>
            </div>
            <div className="space-y-4">
                <input 
                    type="text" 
                    value={venue} 
                    onChange={(e) => setVenue(e.target.value)} 
                    placeholder="e.g. Conference Hall, Regional Office"
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-bank-teal rounded-2xl font-bold text-bank-navy outline-none transition-all text-center"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Regional Office', 'Main Branch', 'Virtual (MS Teams)', 'Zonal Office'].map(v => (
                        <button 
                            key={v} 
                            type="button"
                            onClick={() => setVenue(v)} 
                            className="p-3 text-[10px] font-black uppercase bg-gray-50 rounded-xl hover:bg-bank-navy hover:text-white transition-all border border-transparent active:scale-95"
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
