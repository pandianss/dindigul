import React from 'react';
import { format } from 'date-fns';
import { FileText, Clock, CheckCircle, Download, Upload, Trash2, ChevronRight, RefreshCw } from 'lucide-react';
import { Letter } from '../../types';
import { toTitleCase } from '../../utils';

interface LetterTableProps {
    letters: Letter[];
    loading: boolean;
    onSelect: (letter: Letter) => void;
    onDownload: (id: string, title: string) => void;
    onUpload: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
    uploadingId: string | null;
    onDelete?: (id: string) => void;
}

export const LetterTable: React.FC<LetterTableProps> = ({
    letters,
    loading,
    onSelect,
    onDownload,
    onUpload,
    uploadingId,
    onDelete
}) => {
    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <RefreshCw size={48} className="animate-spin text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">Retrieving correspondence history...</p>
            </div>
        );
    }

    if (letters.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <FileText size={48} className="text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium italic">No letters found for the selected category and period.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Branch & Type</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Subject</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Period</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {letters.map((letter) => (
                        <tr 
                            key={letter.id} 
                            onClick={() => onSelect(letter)}
                            className="hover:bg-gray-50/50 cursor-pointer transition-colors group"
                        >
                            <td className="py-4 px-6">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-lg ${
                                        letter.type === 'APPRECIATION' ? 'bg-amber-50 text-amber-600' : 
                                        letter.type === 'EXPLANATION' ? 'bg-red-50 text-red-600' : 'bg-bank-navy/5 text-bank-navy'
                                    }`}>
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-bank-navy text-sm">{toTitleCase(letter.branch.nameEn)}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{letter.type.replace(/_/g, ' ')}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="py-4 px-6">
                                <p className="text-sm font-medium text-gray-600 max-w-sm truncate">{letter.titleEn}</p>
                            </td>
                            <td className="py-4 px-6">
                                <p className="text-xs font-bold text-gray-500 uppercase">{letter.period}</p>
                            </td>
                            <td className="py-4 px-6 text-center">
                                <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    letter.status === 'DRAFT' ? 'bg-gray-100 text-gray-500' : 
                                    letter.status === 'SENT' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                    {letter.status === 'DRAFT' ? <Clock size={12} /> : <CheckCircle size={12} />}
                                    <span>{letter.status}</span>
                                </div>
                            </td>
                            <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end space-x-2" onClick={e => e.stopPropagation()}>
                                    <button 
                                        onClick={() => onDownload(letter.id, letter.titleEn)}
                                        className="p-2 text-gray-400 hover:text-bank-navy transition-colors"
                                        title="Download PDF"
                                    >
                                        <Download size={18} />
                                    </button>
                                    <div className="relative">
                                        <input 
                                            type="file" 
                                            id={`upload-${letter.id}`} 
                                            className="hidden" 
                                            onChange={(e) => onUpload(letter.id, e)}
                                            accept=".pdf,.jpg,.jpeg,.png"
                                        />
                                        <label 
                                            htmlFor={`upload-${letter.id}`}
                                            className={`p-2 cursor-pointer transition-colors ${letter.scannedCopyUrl ? 'text-emerald-500' : 'text-gray-400 hover:text-bank-navy'}`}
                                            title={letter.scannedCopyUrl ? 'Scan Uploaded' : 'Upload Scanned Copy'}
                                        >
                                            {uploadingId === letter.id ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />}
                                        </label>
                                    </div>
                                    <div className="text-gray-300 group-hover:translate-x-1 group-hover:text-bank-navy transition-all duration-300">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
