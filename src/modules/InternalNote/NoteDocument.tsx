import { format } from 'date-fns';
import { REGIONAL_OFFICE_DATA, DEPARTMENTS } from '@/constants/organization';

interface NoteDocumentProps {
    note: {
        titleEn: string;
        contentJson: string | Record<string, any>;
        createdAt: string;
        preparer: { fullNameEn: string };
        type: string;
        id: string;
    };
}

// Inline styles to avoid Tailwind v4 OKLCH issues with html2canvas
const STYLES = {
    container: { fontFamily: "'Century Gothic', sans-serif", color: '#000000', backgroundColor: '#ffffff' },
    headerBorder: { borderBottom: '4px solid #1B3A6B' },
    textNavy: { color: '#1B3A6B' },
    bgTeal: { backgroundColor: '#008080' },
    borderTeal: { borderLeft: '4px solid #008080' },
    textGray800: { color: '#1f2937' },
    textGray600: { color: '#4b5563' },
    textGray500: { color: '#6b7280' },
    textGray400: { color: '#9ca3af' },
    borderGray200: { borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' },
    borderGray100: { borderTop: '1px solid #f3f4f6' },
    boxBorder: { border: '1px solid #f3f4f6' },
    signatureBorder: { borderTop: '1px solid #000000' }
};

const NoteDocument: React.FC<NoteDocumentProps> = ({ note }) => {
    let details: Record<string, any> = {};
    try {
        details = typeof note.contentJson === 'string' ? JSON.parse(note.contentJson) : (note.contentJson || {});
    } catch (e) {
        console.error("Error parsing contentJson", e);
    }

    const deptName = details?.departmentName || "General Administration Department";

    return (
        <div className="note-document-container p-0" style={STYLES.container}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @page { size: A4; margin: 12.7mm; }
                @media print {
                    body { background: white !important; -webkit-print-color-adjust: exact; }
                    .note-document-container { width: 210mm; min-height: 297mm; padding: 0 !important; margin: 0 !important; box-shadow: none !important; }
                    .no-print { display: none !important; }
                }
                .note-document-container { line-height: 1.5; color: #000000; }
                table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
                table, th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                th { background-color: #f8fafc; font-weight: bold; }
                .rich-content table { font-size: 0.85rem; }
            `}} />

            <div className="flex flex-col min-h-screen">
                <header className="mb-6 pb-6" style={STYLES.headerBorder}>
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <img src={REGIONAL_OFFICE_DATA.logoPath} alt="Bank Logo" className="h-20 w-auto mb-2" />
                            <div className="mt-2" style={STYLES.textNavy}>
                                <h1 className="text-xl font-black uppercase leading-none tracking-tight mb-1">{REGIONAL_OFFICE_DATA.name}</h1>
                                <p className="text-xs font-bold font-tamil mb-1">{REGIONAL_OFFICE_DATA.nameTa}</p>
                                <p className="text-xs font-bold font-hindi">{REGIONAL_OFFICE_DATA.nameHi}</p>
                                <div className="h-1 w-20 mt-2" style={STYLES.bgTeal}></div>
                                <div className="mt-4 pl-3" style={STYLES.borderTeal}>
                                    <h2 className="text-lg font-bold uppercase tracking-wide" style={STYLES.textGray800}>{deptName}</h2>
                                    {(() => {
                                        const d = DEPARTMENTS.find(dep => dep.name === deptName || dep.id === deptName);
                                        return (
                                            <div className="space-y-0.5 mt-1">
                                                {d?.nameTa && <p className="text-[10px] font-bold font-tamil" style={STYLES.textGray600}>{d.nameTa}</p>}
                                                {d?.nameHi && <p className="text-[10px] font-bold font-hindi" style={STYLES.textGray600}>{d.nameHi}</p>}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div className="text-right pl-6 flex flex-col justify-end h-32" style={{ borderLeft: '2px solid #f3f4f6' }}>
                            <div className="space-y-1">
                                <div className="text-white text-[9px] font-bold px-2 py-0.5 inline-block rounded-sm mb-1 uppercase tracking-widest" style={{ backgroundColor: '#1B3A6B' }}>
                                    Regional Administration
                                </div>
                                <p className="text-[11px] font-bold" style={STYLES.textGray800}>{REGIONAL_OFFICE_DATA.address}</p>
                                <div className="text-[10px] font-medium space-y-0.5" style={STYLES.textGray600}>
                                    <p><span className="font-bold" style={STYLES.textNavy}>Tel:</span> {REGIONAL_OFFICE_DATA.phone}</p>
                                    <p><span className="font-bold" style={STYLES.textNavy}>Email:</span> {REGIONAL_OFFICE_DATA.email}</p>
                                    <p><span className="font-bold" style={STYLES.textNavy}>Web:</span> www.iob.in</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 space-y-6 text-sm">
                    <div className="flex justify-between items-baseline mb-8">
                        <div className="font-bold"><p>Ref No: {note.type}/{format(new Date(note.createdAt), 'yyyy')}/{note.id.split('-')[0].toUpperCase()}</p></div>
                        <div className="font-bold"><p>Date: {format(new Date(note.createdAt), 'dd.MM.yyyy')}</p></div>
                    </div>

                    <div className="py-3 uppercase" style={STYLES.borderGray200}>
                        <span className="font-bold">Subject: </span>
                        <span className="font-bold underline">{note.titleEn}</span>
                    </div>

                    <div className="whitespace-normal leading-relaxed py-4 text-justify min-h-[400px] rich-content" dangerouslySetInnerHTML={{ __html: details?.details || '' }} />

                    <div className="grid grid-cols-2 gap-8 pt-10">
                        {details?.amount && (
                            <div className="p-2 rounded" style={STYLES.boxBorder}>
                                <span className="font-bold text-[10px] uppercase block" style={STYLES.textGray500}>Sanction Amount</span>
                                <span className="text-lg font-bold">₹ {details.amount}</span>
                            </div>
                        )}
                        {details?.branch && (
                            <div className="p-2 rounded" style={STYLES.boxBorder}>
                                <span className="font-bold text-[10px] uppercase block" style={STYLES.textGray500}>Concerned Branch</span>
                                <span className="text-lg font-bold uppercase">{details.branch}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-20 pt-20">
                        <div className="text-center">
                            <div className="w-48 mx-auto mt-8 pt-1" style={STYLES.signatureBorder}>
                                <p className="font-bold text-xs uppercase">{note.preparer.fullNameEn}</p>
                                <p className="text-[10px]" style={STYLES.textGray500}>Note Preparer</p>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="w-48 mx-auto mt-8 pt-1" style={STYLES.signatureBorder}>
                                <p className="font-extrabold text-xs uppercase text-transparent">.</p>
                                <p className="text-[10px] font-bold uppercase" style={STYLES.textGray500}>Approving Authority</p>
                            </div>
                        </div>
                    </div>
                </main>

                <footer className="mt-8 pt-2 flex justify-between items-center text-[10px] font-medium" style={{ ...STYLES.borderGray100, ...STYLES.textGray400 }}>
                    <p>OFFICE NOTE - GENERATED BY IOBIAN SYSTEM</p>
                    <div className="page-number"></div>
                </footer>
            </div>
        </div>
    );
};

export default NoteDocument;

