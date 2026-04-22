import React from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

interface DataHistoryProps {
    dailyData: any[];
    onDelete: (id: string) => void;
}

export const DataHistory: React.FC<DataHistoryProps> = ({ dailyData, onDelete }) => {
    return (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-50 bg-gray-50/10 flex justify-between items-center">
                <div>
                    <h3 className="font-black text-bank-navy text-lg uppercase tracking-tight">Data Entry History</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-bold">Manage individual performance records</p>
                </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full">
                    <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
                        <tr>
                            <th className="py-4 px-8 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Branch</th>
                            <th className="py-4 px-8 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                            <th className="py-4 px-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Metric Value</th>
                            <th className="py-4 px-8 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {dailyData.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-12 text-center text-gray-400 font-bold italic text-sm">No entries recorded for this campaign yet.</td>
                            </tr>
                        ) : dailyData.slice().reverse().map((entry: any) => (
                            <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-4 px-8">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-[10px] font-black text-bank-navy bg-gray-100 px-2 py-1 rounded-md">{entry.branch.code}</span>
                                        <span className="font-bold text-bank-navy text-sm uppercase">{entry.branch.nameEn}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-8">
                                    <span className="text-sm font-bold text-gray-500">{format(new Date(entry.date), 'dd MMM yyyy')}</span>
                                </td>
                                <td className="py-4 px-8 text-center text-sm font-black text-bank-teal">
                                    {entry.value.toLocaleString()}
                                </td>
                                <td className="py-4 px-8 text-right">
                                    <button 
                                        onClick={() => onDelete(entry.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
