import React from 'react';
import { Calendar, User } from 'lucide-react';
import { Signatory } from '../../types';

interface LetterFiltersProps {
    activeTab: string;
    selectedDate: string;
    setSelectedDate: (date: string) => void;
    signatories: Signatory[];
    selectedSignatoryId: string;
    setSelectedSignatoryId: (id: string) => void;
}

export const LetterFilters: React.FC<LetterFiltersProps> = ({
    activeTab,
    selectedDate,
    setSelectedDate,
    signatories,
    selectedSignatoryId,
    setSelectedSignatoryId
}) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
                <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">{activeTab === 'MANUAL' ? 'Date Filter' : 'Target Data Date'}</label>
                    <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <Calendar size={16} className="text-bank-navy" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold text-bank-navy focus:ring-0"
                        />
                    </div>
                </div>

                {(activeTab === 'PERFORMANCE' || activeTab === 'OP_RISK') && signatories.length > 0 && (
                    <div className="flex flex-col min-w-[200px]">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Signing Authority</label>
                        <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                            <User size={16} className="text-bank-navy" />
                            <select
                                value={selectedSignatoryId}
                                onChange={(e) => setSelectedSignatoryId(e.target.value)}
                                className="bg-transparent border-none text-sm font-bold text-bank-navy focus:ring-0 w-full"
                            >
                                <option value="">Default Signatory</option>
                                {signatories.map(s => (
                                    <option key={s.id} value={s.id}>{s.fullNameEn}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
