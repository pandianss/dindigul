import React from 'react';
import { Award, TrendingUp, Upload } from 'lucide-react';

interface MethodSelectorProps {
    strategy: 'SIZE_BASED' | 'POPULATION_BASED' | 'UPLOAD_BASED';
    setStrategy: (strategy: 'SIZE_BASED' | 'POPULATION_BASED' | 'UPLOAD_BASED') => void;
}

export const MethodSelector: React.FC<MethodSelectorProps> = ({ strategy, setStrategy }) => {
    const methods = [
        { id: 'SIZE_BASED', label: 'Standard (By Branch Size)', icon: Award },
        { id: 'POPULATION_BASED', label: 'By Population Group', icon: TrendingUp },
        { id: 'UPLOAD_BASED', label: 'Bulk Excel Upload', icon: Upload }
    ];

    return (
        <div className="space-y-6 lg:border-l lg:border-r lg:px-8 border-gray-100">
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">2. Allotment Method</label>
                <div className="grid grid-cols-1 gap-2">
                    {methods.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setStrategy(m.id as any)}
                            className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all ${
                                strategy === m.id 
                                ? 'border-bank-teal bg-bank-teal/5 text-bank-navy ring-4 ring-bank-teal/10' 
                                : 'border-gray-50 bg-gray-50/50 text-gray-500 hover:border-gray-200'
                            }`}
                        >
                            <m.icon size={20} className={strategy === m.id ? 'text-bank-teal' : 'text-gray-400'} />
                            <span className="font-bold text-sm">{m.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
