import React from 'react';
import { ChevronLeft, Download } from 'lucide-react';
import DocumentPreview from '../../../../components/DocumentPreview';
import { Letter } from '../../types';
import { SealPositioner } from './SealPositioner';
import { StatusManager } from './StatusManager';

interface LetterPreviewProps {
    letter: Letter;
    onBack: () => void;
    onDownload: (id: string, title: string) => void;
    onUpdateStatus: (id: string, status: string) => void;
    onUploadScan: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
    uploadingId: string | null;
    isMovingSeal: boolean;
    setIsMovingSeal: (val: boolean) => void;
    sealPos: { x: number, y: number };
    setSealPos: (pos: { x: number, y: number }) => void;
    handleSaveSealPosition: () => void;
    metadata: any;
}

export const LetterPreview: React.FC<LetterPreviewProps> = ({
    letter,
    onBack,
    onDownload,
    onUpdateStatus,
    onUploadScan,
    uploadingId,
    isMovingSeal,
    setIsMovingSeal,
    sealPos,
    setSealPos,
    handleSaveSealPosition,
    metadata
}) => {
    return (
        <div className="fixed inset-0 z-[100] bg-bank-navy/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-6xl h-[95vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative border border-white/20">
                {/* Header */}
                <div className="bg-white p-6 border-b border-gray-100 flex items-center justify-between shrink-0 relative z-30">
                    <div className="flex items-center space-x-6">
                        <button 
                            onClick={onBack}
                            className="bg-gray-50 p-3 rounded-2xl border border-gray-100 hover:border-bank-navy/20 transition-all text-gray-400 hover:text-bank-navy group"
                        >
                            <ChevronLeft size={20} className="transform group-hover:-translate-x-1 duration-300" />
                        </button>
                        <div>
                            <h3 className="text-xl font-black text-bank-navy uppercase tracking-tight leading-none">{letter.branch.nameEn}</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">{letter.type.replace(/_/g, ' ')} • {letter.period}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => onDownload(letter.id, letter.titleEn)}
                            className="flex items-center space-x-2 bg-gray-50 text-bank-navy px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-bank-navy/5 transition-all border border-gray-100"
                        >
                            <Download size={16} />
                            <span>Download PDF</span>
                        </button>
                        <div className="h-8 w-px bg-gray-100 mx-2" />
                        <StatusManager 
                            letter={letter}
                            onUpdateStatus={onUpdateStatus}
                            onUploadScan={onUploadScan}
                            uploadingId={uploadingId}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-12 bg-gray-50/50 custom-scrollbar relative">
                    <SealPositioner 
                        isMovingSeal={isMovingSeal}
                        setIsMovingSeal={setIsMovingSeal}
                        sealPos={sealPos}
                        setSealPos={setSealPos}
                        handleSaveSealPosition={handleSaveSealPosition}
                        deptSealUrl={metadata.organization?.deptSealUrl}
                    />
                    
                    <div className="max-w-[800px] mx-auto bg-white shadow-2xl rounded-sm p-1">
                        <DocumentPreview 
                            letter={letter} 
                            metadata={metadata} 
                            isSealMovable={isMovingSeal}
                            sealX={sealPos.x}
                            sealY={sealPos.y}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
