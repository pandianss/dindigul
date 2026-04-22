import React from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { Manual } from '../../types';

interface SOPDocumentProps {
    manual: Manual;
    onClose: () => void;
}

export const SOPDocument: React.FC<SOPDocumentProps> = ({ manual, onClose }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-start justify-center p-0 md:p-10 bg-bank-navy/90 backdrop-blur-xl animate-in fade-in duration-500 overflow-y-auto custom-scrollbar">
            <div className="bg-white w-full max-w-4xl shadow-2xl relative animate-in slide-in-from-bottom-10 duration-700 min-h-screen md:min-h-[11in] flex flex-col">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-3 bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all shadow-sm z-50 no-print"
                >
                    <X size={24} />
                </button>

                <div className="p-16 flex-grow flex flex-col">
                    {/* Document Header */}
                    <div className="text-center mb-12 border-b-2 border-bank-navy pb-8">
                        <h1 className="text-2xl font-black text-bank-navy tracking-widest uppercase mb-1">Standard Operating Procedure</h1>
                        <p className="text-[10px] font-bold text-bank-teal uppercase tracking-[0.4em] mb-6">Operations & Compliance Division</p>
                        
                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-bank-navy tracking-tight uppercase">{manual.titleEn}</h2>
                            {manual.titleTa && <p className="font-tamil text-bank-navy text-lg">{manual.titleTa}</p>}
                            {manual.titleHi && <p className="font-hindi text-bank-navy text-lg">{manual.titleHi}</p>}
                        </div>
                        <div className="mt-4 inline-block px-4 py-1 bg-bank-navy text-white text-[9px] font-black rounded-full uppercase tracking-widest">
                            Dept: {manual.department?.nameEn}
                        </div>
                    </div>

                    {/* Document Meta */}
                    <div className="grid grid-cols-2 gap-8 mb-12 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        <div className="space-y-2">
                            <div className="flex justify-between border-b border-gray-100 pb-1">
                                <span>Reference Code</span>
                                <span className="text-bank-navy font-black">MAN/{manual.department?.code}/{(manual.id.substring(0, 4)).toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 pb-1">
                                <span>Issued Date</span>
                                <span className="text-bank-navy font-black">{format(new Date(manual.createdAt), 'dd MMM yyyy')}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between border-b border-gray-100 pb-1">
                                <span>Last Updated</span>
                                <span className="text-bank-navy font-black">{format(new Date(manual.updatedAt), 'dd MMM yyyy')}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 pb-1">
                                <span>Security Level</span>
                                <span className="text-bank-teal font-black">INTERNAL USE ONLY</span>
                            </div>
                        </div>
                    </div>

                    {/* Objective Section */}
                    <div className="mb-12">
                        <h3 className="text-xs font-black text-bank-navy uppercase tracking-widest border-l-4 border-bank-gold pl-3 mb-4">1. Objective & Scope</h3>
                        <div 
                            className="text-sm text-gray-600 leading-relaxed font-medium quill-content"
                            dangerouslySetInnerHTML={{ __html: manual.description || 'This manual outlines the standard operating procedures and mandated activities.' }}
                        />
                    </div>

                    {/* Activities Table */}
                    <div className="mb-12 flex-grow">
                        <h3 className="text-xs font-black text-bank-navy uppercase tracking-widest border-l-4 border-bank-gold pl-3 mb-6">2. Operational Procedures</h3>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-widest text-bank-navy border-b border-gray-200">
                                        <th className="p-4 w-16">Seq</th>
                                        <th className="p-4">Activity & Instruction</th>
                                        <th className="p-4 w-32">Frequency</th>
                                        <th className="p-4 w-32 text-right">Milestone</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {manual.activities.map((activity, idx) => (
                                        <tr key={activity.id} className="text-xs">
                                            <td className="p-4 align-top font-black text-gray-300">{idx + 1}</td>
                                            <td className="p-4 space-y-2">
                                                <div className="font-black text-bank-navy uppercase tracking-tight">{activity.titleEn}</div>
                                                {activity.description && (
                                                    <div className="text-[11px] text-gray-500 leading-relaxed quill-content" dangerouslySetInnerHTML={{ __html: activity.description }} />
                                                )}
                                            </td>
                                            <td className="p-4 align-top">
                                                <span className="text-[9px] font-black uppercase bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                                                    {activity.frequency}
                                                </span>
                                            </td>
                                            <td className="p-4 align-top text-right font-black text-bank-gold text-[10px]">
                                                {activity.dueDate || '--'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer / Disclaimer */}
                    <div className="mt-auto pt-12 text-center border-t border-gray-100">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                            © {format(new Date(), 'yyyy')} Dindigul Regional Office • Proprietary Information
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
