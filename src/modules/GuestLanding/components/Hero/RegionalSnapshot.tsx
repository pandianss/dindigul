import React from 'react';
import { REGIONAL_SNAPSHOT } from '../../constants';

export const RegionalSnapshot: React.FC = () => {
    return (
        <div className="hidden lg:block bg-white/5 border border-white/10 backdrop-blur-md p-7 rounded-sm">
            <div className="text-[0.6rem] font-bold tracking-[0.15em] uppercase text-[#00AEEF] mb-5 pb-3 border-b border-white/10">
                Regional Snapshot
            </div>
            {REGIONAL_SNAPSHOT.map((row, i) => (
                <div key={i} className={`flex justify-between items-baseline py-2 text-[0.8rem] ${i !== REGIONAL_SNAPSHOT.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <span className="text-white/50">{row.k}</span>
                    <span className={`font-bold text-[0.85rem] ${row.hl ? 'text-[#00AEEF]' : 'text-white'}`}>{row.v}</span>
                </div>
            ))}
        </div>
    );
};
