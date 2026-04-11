import React, { useState, useEffect } from 'react';
import { Award, Lock, User, Calendar, Clock, Hash, Save } from 'lucide-react';

interface Signatory {
    name: string;
    nameTa?: string;
    nameHi?: string;
    titleEn: string;
    titleTa?: string;
    titleHi?: string;
}

interface DocumentPreviewProps {
    title: string;
    titleHi?: string;
    titleTa?: string;
    subTitle?: string;
    refNo: string;
    date: string;
    bodyHtml: string;
    initiator?: Signatory;
    reviewers?: Signatory[];
    approver?: Signatory;
    organization: any;
    deptSealSrc?: string;
    initialSealPos?: { x: number, y: number };
    onSaveSealPos?: (pos: { x: number, y: number }) => void;
    hideApprovedStatus?: boolean;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
    title, titleHi, titleTa, subTitle, refNo, date, bodyHtml,
    initiator, reviewers, approver, organization: org,
    deptSealSrc, initialSealPos, onSaveSealPos, hideApprovedStatus
}) => {
    const [isMovingSeal, setIsMovingSeal] = useState(false);
    const [sealPos, setSealPos] = useState(initialSealPos || { x: 0, y: 30 });

    useEffect(() => {
        if (initialSealPos) setSealPos(initialSealPos);
    }, [initialSealPos]);

    const handleSealMove = (pos: { x: number, y: number }) => {
        setSealPos(pos);
    };

    return (
        <div className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-bank-teal/20 max-w-4xl mx-auto flex flex-col h-[85vh]">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-2">
                    <div className="p-2 bg-bank-navy text-white rounded-lg">
                        <Award size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-bank-navy uppercase tracking-wider">Document Preview</h3>
                        <p className="text-[10px] text-gray-400 font-bold tracking-tighter">Adjust and verify before final generation</p>
                    </div>
                </div>
                
                <div className="flex items-center space-x-2">
                    {deptSealSrc && (
                        <>
                            <button
                                onClick={() => setIsMovingSeal(!isMovingSeal)}
                                className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${
                                    isMovingSeal 
                                    ? 'bg-bank-teal text-white ring-2 ring-bank-teal ring-offset-2 shadow-lg scale-105' 
                                    : 'bg-white text-bank-navy border border-gray-200 hover:border-bank-teal hover:bg-bank-teal/5'
                                }`}
                            >
                                <Award size={14} />
                                {isMovingSeal ? 'DONE MOVING' : 'MOVE SEAL'}
                            </button>
                            {isMovingSeal && (
                                <button
                                    onClick={() => {
                                        onSaveSealPos?.(sealPos);
                                        setIsMovingSeal(false);
                                    }}
                                    className="px-4 py-2 bg-bank-navy text-white rounded-lg font-bold text-xs hover:shadow-lg transition-all flex items-center gap-2"
                                >
                                    <Save size={14} />
                                    <span>SAVE POSITION</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-y-auto p-12 bg-gray-100/30 font-serif document-preview-canvas">
                <div className="bg-white w-full min-h-full shadow-sm p-12 relative mx-auto overflow-hidden print:shadow-none" style={{ minWidth: '210mm' }}>
                    
                    {/* Header */}
                    <div className="text-center mb-8 border-b-2 border-bank-navy pb-6 relative">
                        <h1 className="text-xl font-bold text-bank-navy mb-1">{org.bankNameEn}</h1>
                        <h2 className="text-lg font-bold text-bank-navy mb-1">{org.bankNameTa} / {org.bankNameHi}</h2>
                        <div className="text-sm font-semibold text-gray-600 space-y-0.5">
                            <p className="uppercase">{org.officeNameEn}</p>
                            <p>{org.officeNameTa} / {org.officeNameHi}</p>
                            <p className="text-xs italic">{org.addressEn}</p>
                        </div>
                    </div>

                    {/* Metadata (Ref/Date) */}
                    <div className="flex justify-between items-start mb-8 text-[13px] font-bold text-gray-700">
                        <div className="flex items-start space-x-1.5">
                            <Hash size={14} className="mt-0.5 text-bank-teal" />
                            <span>REF: {refNo || 'PENDING'}</span>
                        </div>
                        <div className="flex items-start space-x-1.5">
                            <Calendar size={14} className="mt-0.5 text-bank-teal" />
                            <span>DATE: {date}</span>
                        </div>
                    </div>

                    {/* Titles */}
                    <div className="text-center mb-8">
                        {titleTa && <h3 className="text-[15px] font-bold text-bank-navy mb-1 font-tamil">{titleTa}</h3>}
                        {titleHi && <h3 className="text-[15px] font-bold text-bank-navy mb-1 font-hindi">{titleHi}</h3>}
                        <h3 className="text-[16px] font-black text-bank-navy uppercase border-b border-bank-navy/10 pb-2 inline-block px-12">{title}</h3>
                        {subTitle && <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-wide">{subTitle}</p>}
                    </div>

                    {/* Body */}
                    <div 
                        className="text-[14.5px] leading-[1.6] text-justify space-y-4 mb-12 text-gray-800 ql-editor"
                        dangerouslySetInnerHTML={{ __html: bodyHtml }}
                        style={{ padding: 0 }}
                    />

                    {/* Signatures Container */}
                    <div className="signatures-root relative mt-16 min-h-[220px]">
                        
                        {/* Row 1 (Initiator) */}
                        <div className="flex justify-between items-start w-full mb-8">
                            {initiator && (
                                <div className="text-center w-[175px] relative z-20">
                                    <div className="border-t-[1.5px] border-gray-400 mb-1 pt-1"></div>
                                    <div className="text-bank-navy font-bold text-[11.5px] space-y-0.5">
                                        {initiator.nameHi && <p className="font-hindi tracking-tighter text-[10px]">({initiator.nameHi})</p>}
                                        {initiator.nameTa && <p className="font-tamil tracking-tighter text-[9px]">({initiator.nameTa})</p>}
                                        <p>({initiator.name})</p>
                                    </div>
                                    <div className="text-gray-500 font-bold text-[10px] space-y-0.5 leading-tight">
                                        {initiator.titleHi && <p className="font-hindi">{initiator.titleHi}</p>}
                                        {initiator.titleTa && <p className="font-tamil text-[9px]">{initiator.titleTa}</p>}
                                        <p className="uppercase">{initiator.titleEn}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Row 2 (Reviewers + Approver) */}
                        <div className="flex justify-between items-start w-full flex-wrap gap-x-8 gap-y-12">
                            <div className="flex flex-wrap gap-x-8 gap-y-12 flex-1">
                                {reviewers?.map((rev, idx) => (
                                    <div key={idx} className="text-center w-[175px] relative z-20">
                                        <div className="border-t-[1.5px] border-gray-400 mb-1 pt-1"></div>
                                        <div className="text-bank-navy font-bold text-[11.5px] space-y-0.5">
                                            {rev.nameHi && <p className="font-hindi tracking-tighter text-[10px]">({rev.nameHi})</p>}
                                            {rev.nameTa && <p className="font-tamil tracking-tighter text-[9px]">({rev.nameTa})</p>}
                                            <p>({rev.name})</p>
                                        </div>
                                        <div className="text-gray-500 font-bold text-[10px] space-y-0.5 leading-tight">
                                            {rev.titleHi && <p className="font-hindi">{rev.titleHi}</p>}
                                            {rev.titleTa && <p className="font-tamil text-[9px]">{rev.titleTa}</p>}
                                            <p className="uppercase">{rev.titleEn}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {approver && (
                                <div className="text-center w-[175px] relative z-20 ml-auto">
                                    {!hideApprovedStatus && (
                                        <div className="absolute top-[-25px] left-0 right-0 text-[10px] font-black text-bank-teal uppercase whitespace-nowrap animate-pulse">
                                            अनुमोदित / Approved
                                        </div>
                                    )}
                                    <p className="text-[10px] text-gray-400 font-normal mb-1">Sd/-</p>
                                    <div className="border-t-[1.5px] border-gray-400 mb-1 pt-1"></div>
                                    <div className="text-bank-navy font-bold text-[11.5px] space-y-0.5">
                                        {approver.nameHi && <p className="font-hindi tracking-tighter text-[10px]">({approver.nameHi})</p>}
                                        {approver.nameTa && <p className="font-tamil tracking-tighter text-[9px]">({approver.nameTa})</p>}
                                        <p>({approver.name})</p>
                                    </div>
                                    <div className="text-gray-500 font-bold text-[10px] space-y-0.5 leading-tight">
                                        {approver.titleHi && <p className="font-hindi">{approver.titleHi}</p>}
                                        {approver.titleTa && <p className="font-tamil text-[9px]">{approver.titleTa}</p>}
                                        <p className="uppercase">{approver.titleEn}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Draggable Seal Overlay */}
                        {deptSealSrc && (
                            <div 
                                className={`absolute w-[160px] h-[160px] transform -rotate-15 ${isMovingSeal ? 'cursor-move ring-4 ring-bank-teal ring-dashed bg-bank-teal/20 z-[100] opacity-[0.45] shadow-2xl' : 'pointer-events-none z-[10] opacity-[0.22]'}`}
                                style={{ 
                                    left: `${sealPos.x}%`, 
                                    top: `${sealPos.y}%`,
                                    transition: isMovingSeal ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                                onMouseDown={(e) => {
                                    if (!isMovingSeal) return;
                                    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                                    if (!rect) return;
                                    
                                    const handleMouseMove = (mmE: MouseEvent) => {
                                        const x = ((mmE.clientX - rect.left - 80) / rect.width) * 100;
                                        const y = ((mmE.clientY - rect.top - 80) / rect.height) * 100;
                                        handleSealMove({ 
                                            x: Math.max(-10, Math.min(x, 90)), 
                                            y: Math.max(-10, Math.min(y, 90)) 
                                        });
                                    };
                                    
                                    const handleMouseUp = () => {
                                        window.removeEventListener('mousemove', handleMouseMove);
                                        window.removeEventListener('mouseup', handleMouseUp);
                                    };
                                    
                                    window.addEventListener('mousemove', handleMouseMove);
                                    window.addEventListener('mouseup', handleMouseUp);
                                }}
                            >
                                <img 
                                    src={deptSealSrc} 
                                    alt="Seal" 
                                    className="w-full h-full object-contain select-none pointer-events-none drop-shadow-lg"
                                    onError={(e) => {
                                        // Fallback to a geometric placeholder if image still fails
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement!.style.border = '4px solid #00A693';
                                        e.currentTarget.parentElement!.style.borderRadius = '50%';
                                        e.currentTarget.parentElement!.style.display = 'flex';
                                        e.currentTarget.parentElement!.style.alignItems = 'center';
                                        e.currentTarget.parentElement!.style.justifyContent = 'center';
                                        e.currentTarget.parentElement!.innerHTML = '<span style="color: #00A693; font-weight: bold; font-size: 10px;">SEAL</span>';
                                    }}
                                />
                                {isMovingSeal && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-bank-teal text-white px-2 py-1 rounded text-[8px] font-bold uppercase shadow-lg">Draggable</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentPreview;
