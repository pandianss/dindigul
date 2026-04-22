import React from 'react';
import { CheckCircle, Clock, Upload, Trash2, RefreshCw } from 'lucide-react';
import { Letter } from '../../types';

interface StatusManagerProps {
    letter: Letter;
    onUpdateStatus: (id: string, status: string) => void;
    onUploadScan: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
    uploadingId: string | null;
    onDelete?: (id: string) => void;
}

export const StatusManager: React.FC<StatusManagerProps> = ({
    letter,
    onUpdateStatus,
    onUploadScan,
    uploadingId,
    onDelete
}) => {
    return (
        <div className="flex items-center space-x-3">
            {letter.status === 'DRAFT' ? (
                <button 
                    onClick={() => onUpdateStatus(letter.id, 'SENT')}
                    className="flex items-center space-x-2 bg-bank-navy text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-bank-navy/20"
                >
                    <CheckCircle size={16} />
                    <span>Approve & Freeze</span>
                </button>
            ) : (
                <button 
                    onClick={() => onUpdateStatus(letter.id, 'DRAFT')}
                    className="flex items-center space-x-2 bg-gray-100 text-gray-500 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-50 hover:text-orange-600 transition-all"
                >
                    <Clock size={16} />
                    <span>Open for Editing</span>
                </button>
            )}

            <div className="relative">
                <input 
                    type="file" 
                    id={`viewer-upload-${letter.id}`} 
                    className="hidden" 
                    onChange={(e) => onUploadScan(letter.id, e)}
                />
                <label 
                    htmlFor={`viewer-upload-${letter.id}`}
                    className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${
                        letter.scannedCopyUrl ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400 border border-transparent'
                    }`}
                >
                    {uploadingId === letter.id ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                    <span>{letter.scannedCopyUrl ? 'Scan Uploaded' : 'Upload Scan'}</span>
                </label>
            </div>

            {onDelete && (
                <button 
                    onClick={() => onDelete(letter.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                    <Trash2 size={18} />
                </button>
            )}
        </div>
    );
};
