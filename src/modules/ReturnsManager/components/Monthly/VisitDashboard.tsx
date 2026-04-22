import React from 'react';
import { PlusCircle, Download, FileSearch } from 'lucide-react';
import { Visit } from '../../types';
import { format } from 'date-fns';

interface VisitDashboardProps {
    visits: Visit[];
    onAddLog: () => void;
    onDownloadObservation: (id: string) => void;
}

export const VisitDashboard: React.FC<VisitDashboardProps> = ({
    visits,
    onAddLog,
    onDownloadObservation
}) => {
    return (
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden min-h-[500px]">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Monthly Visit Logs</h4>
                <button 
                    onClick={onAddLog} 
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all active:scale-95"
                >
                    <PlusCircle size={20}/>
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50">
                        <tr>
                            <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 racking-widest">Date</th>
                            <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Branch</th>
                            <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Visitor</th>
                            <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Category</th>
                            <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {visits.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-8 py-4 text-xs font-bold text-slate-700">{format(new Date(v.visitDate), 'dd MMM yyyy')}</td>
                                <td className="px-8 py-4 text-xs font-bold text-slate-900">{v.branch.nameEn} ({v.branch.code})</td>
                                <td className="px-8 py-4 text-xs font-medium text-slate-600">{v.visitor?.fullNameEn}</td>
                                <td className="px-8 py-4">
                                    <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-sm border border-indigo-100/50">
                                        {v.visitorCategory}
                                    </span>
                                </td>
                                <td className="px-8 py-4 text-right">
                                    <button 
                                        onClick={() => onDownloadObservation(v.id)} 
                                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                        title="Download Observation Letter"
                                    >
                                        <Download size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {visits.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
                                    <FileSearch size={32} className="mx-auto text-slate-200 mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No logs found for selected month</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
