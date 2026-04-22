import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

interface ConfigPanelProps {
    sbThreshold: number;
    setSbThreshold: (val: number) => void;
    cdThreshold: number;
    setCdThreshold: (val: number) => void;
    eligibleSchemes: string;
    setEligibleSchemes: (val: string) => void;
    handleUpdateThreshold: () => void;
    updatingThreshold: boolean;
    setShowSettings: (show: boolean) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
    sbThreshold,
    setSbThreshold,
    cdThreshold,
    setCdThreshold,
    eligibleSchemes,
    setEligibleSchemes,
    handleUpdateThreshold,
    updatingThreshold,
    setShowSettings
}) => {
    return (
        <div className="card p-6 border-2 border-bank-gold/20 bg-bank-gold/5 animate-in slide-in-from-top-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-bank-navy flex items-center space-x-2 text-sm uppercase tracking-widest">
                    <SettingsIcon size={16} />
                    <span>Analytics Configuration</span>
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xs uppercase">Close</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SB Min. Balance Threshold</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={sbThreshold}
                            onChange={(e) => setSbThreshold(Number(e.target.value))}
                            className="w-full bg-white border border-bank-navy/10 rounded-xl px-4 py-3 text-sm font-black text-bank-navy focus:ring-2 focus:ring-bank-teal/20 outline-none transition-all"
                            placeholder="e.g. 500"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-300 uppercase">INR</span>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CD Min. Balance Threshold</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={cdThreshold}
                            onChange={(e) => setCdThreshold(Number(e.target.value))}
                            className="w-full bg-white border border-bank-navy/10 rounded-xl px-4 py-3 text-sm font-black text-bank-navy focus:ring-2 focus:ring-bank-teal/20 outline-none transition-all"
                            placeholder="e.g. 1000"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-300 uppercase">INR</span>
                    </div>
                </div>
                <div className="space-y-2 lg:col-span-2 mt-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Eligible Product Schemes</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={eligibleSchemes}
                            onChange={(e) => setEligibleSchemes(e.target.value)}
                            className="w-full bg-white border border-bank-navy/10 rounded-xl px-4 py-3 text-sm font-black text-bank-navy focus:ring-2 focus:ring-bank-teal/20 outline-none transition-all"
                            placeholder="e.g. SBREG, CDGEN, SBNRE"
                        />
                    </div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase italic">Comma-separated scheme codes. Leave entry empty to allow all schemes.</p>
                </div>
                <button
                    onClick={handleUpdateThreshold}
                    disabled={updatingThreshold}
                    className="bg-bank-navy text-white text-[10px] font-black uppercase tracking-widest px-8 py-4 rounded-xl hover:bg-bank-navy/90 transition-all shadow-lg shadow-bank-navy/10 disabled:opacity-50"
                >
                    {updatingThreshold ? 'Saving...' : 'Apply Thresholds'}
                </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-4 italic font-medium">Changing this will recalculate all performance metrics across the dashboard.</p>
        </div>
    );
};
