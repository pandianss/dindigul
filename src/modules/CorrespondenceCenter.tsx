import React, { useState, useEffect } from 'react';
import { Mail, Award, AlertCircle, RefreshCw, CheckCircle, ChevronRight, X, FileText } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import api from '../services/api';
import { REGIONAL_OFFICE_DATA, GLOBAL_CONFIG, THEME_CONFIG } from '../constants/organization';

interface Letter {
    id: string;
    type: 'APPRECIATION' | 'EXPLANATION' | 'OP_RISK';
    status: 'DRAFT' | 'SENT' | 'ACKNOWLEDGED';
    titleEn: string;
    contentEn: string;
    branch: {
        nameEn: string;
        headUser?: {
            fullNameEn: string;
            fullNameHi?: string | null;
            fullNameTa?: string | null;
            gender?: string;
            designation?: {
                nameEn: string;
                nameHi?: string | null;
                nameTa?: string | null;
            };
        };
    };
    period: string;
    createdAt: string;
    orgMeta?: any;
}

const CorrespondenceCenter: React.FC = () => {
    const [letters, setLetters] = useState<Letter[]>([]);
    const [metadata, setMetadata] = useState<{
        regionHeadName: string,
        regionHeadDesignation: string,
        organization?: {
            bankNameEn: string;
            bankNameTa: string;
            bankNameHi: string;
            officeNameEn: string;
            officeNameTa: string;
            officeNameHi: string;
            address: string;
            phone: string;
            email: string;
            signingAuthEn: string;
            signingAuthTa: string;
            signingAuthHi: string;
            signatoryName?: string;
        }
    }>({
        regionHeadName: 'Regional Manager',
        regionHeadDesignation: 'Regional Manager'
    });
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    const toTitleCase = (str: string) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const handleDownloadPdf = async (letterId: string, title: string) => {
        const element = document.getElementById(`letter-content-${letterId}`);
        if (!element) return;

        try {
            const html2pdf = (await import('html2pdf.js')).default;

            // Heuristic to map oklch(L C H) to a safe static hex color to prevent html2canvas parsing crashes
            const oklchToHex = (match: string) => {
                const parts = match.split(/[\s,()]+/);
                if (parts.length > 1) {
                    let l = parseFloat(parts[1]);
                    if (parts[1].includes('%')) l = l / 100;
                    else if (l > 1) l = l / 100;

                    if (l > 0.85) return '#f8fafc'; // light
                    if (l > 0.6) return '#cbd5e1';  // gray
                    if (l < 0.4) return '#1e293b';  // dark navy
                    return '#64748b';               // mid-slate
                }
                return '#1e293b';
            };

            const opt: any = {
                margin: 0,
                filename: `${title.replace(/\s+/g, '_')}_${format(new Date(), 'ddMMyyyy')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    // Intercept the internal iframe document before rendering to strip unsupported CSS functions
                    onclone: (clonedDoc: HTMLDocument) => {
                        // 1. Completely DESTROY all external stylesheets and injected <style> tags in the clone
                        // Vite injects massive <style type="text/css"> blocks containing raw oklch/oklab variables
                        // that html2canvas will crash on if left in the DOM.
                        const linkTags = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"], style'));
                        linkTags.forEach((el) => {
                            if (el.parentNode) el.parentNode.removeChild(el);
                        });

                        // 2. To maintain layout without those stylesheets, explicitly compute EVERY style from the real DOM 
                        // and inline them onto the clone nodes securely.
                        const clonedTree = clonedDoc.getElementById(`letter-content-${letterId}`);
                        if (clonedTree && element) {
                            const applyComputedSafely = (src: HTMLElement, dest: HTMLElement) => {
                                const computed = window.getComputedStyle(src);
                                let cssText = '';

                                for (let i = 0; i < computed.length; i++) {
                                    const propName = computed[i];
                                    let propVal = computed.getPropertyValue(propName);

                                    // Replace oklch/oklab with safe hex anywhere it appears
                                    if (propVal && (propVal.includes('oklch') || propVal.includes('oklab') || propVal.includes('var('))) {
                                        propVal = propVal.replace(/(oklch|oklab)\([^)]+\)/g, oklchToHex);
                                        // Some var() fallbacks might still be uncaught, provide final structural fallbacks
                                        if (propVal.includes('var(')) {
                                            if (propName.includes('background')) propVal = '#ffffff';
                                            else if (propName.includes('color') || propName.includes('fill')) propVal = '#1e293b';
                                            else if (propName.includes('border') || propName.includes('outline')) propVal = '#cbd5e1';
                                            else propVal = 'transparent';
                                        }
                                    }
                                    cssText += `${propName}: ${propVal}; `;
                                }
                                dest.style.cssText = cssText;

                                // Recursively process children
                                const srcChildren = Array.from(src.children) as HTMLElement[];
                                const destChildren = Array.from(dest.children) as HTMLElement[];
                                for (let j = 0; j < srcChildren.length; j++) {
                                    if (destChildren[j]) applyComputedSafely(srcChildren[j], destChildren[j]);
                                }
                            };

                            applyComputedSafely(element, clonedTree);
                        }
                    }
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            await html2pdf().set(opt).from(element).save();
        } catch (error: any) {
            console.error('Failed to generate PDF:', error);
            alert(`Failed to generate PDF. Error: ${error?.message || error}`);
        }
    };

    const handleUploadScan = async (letterId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingId(letterId);
        const formData = new FormData();
        formData.append('document', file);

        try {
            await api.post(`/letters/${letterId}/upload-scan`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchLetters(); // Refresh list to get updated scannedCopyUrl
            if (selectedLetter && selectedLetter.id === letterId) {
                // optimistically update the selected letter view
                setSelectedLetter({ ...selectedLetter, scannedCopyUrl: 'uploaded' } as any);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload scanned copy.');
        } finally {
            setUploadingId(null);
            e.target.value = ''; // Reset input
        }
    };

    const fetchLetters = () => {
        setLoading(true);
        api.get('/letters')
            .then(res => res.data)
            .then(data => {
                const actualData = data.data || data.letters;
                if (actualData && data.metadata) {
                    setLetters(actualData);
                    setMetadata(data.metadata);
                } else if (actualData) {
                    setLetters(actualData);
                } else {
                    setLetters(Array.isArray(data) ? data : []);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching letters:', err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchLetters();
    }, []);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const response = await api.post('/letters/generate', {
                period: format(subMonths(new Date(), 1), 'MMM yyyy')
            });
            if (response.status === 200) {
                fetchLetters();
            }
        } catch (error) {
            console.error('Error generating letters:', error);
        } finally {
            setGenerating(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await api.patch(`/letters/${id}/status`, { status });
            fetchLetters();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    return (
        <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy">Correspondence Center</h2>
                    <p className="text-gray-500">Manage formal appreciation and explanation letters</p>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="btn-primary flex items-center space-x-2 bg-bank-navy text-white px-4 py-2 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-md"
                >
                    <RefreshCw size={18} className={generating ? 'animate-spin' : ''} />
                    <span>{generating ? 'Generating...' : 'Generate Monthly Drafts'}</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bank-navy"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {letters.length > 0 ? (
                        letters.map(letter => (
                            <div key={letter.id} className="card p-6 bg-white border border-gray-100 hover:shadow-lg transition-all">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-4">
                                        <div className={`p-3 rounded-xl ${letter.type === 'APPRECIATION' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {letter.type === 'APPRECIATION' ? <Award size={24} /> : <AlertCircle size={24} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <h3 className="font-bold text-bank-navy text-lg">{letter.titleEn}</h3>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${letter.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' :
                                                    letter.status === 'SENT' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {letter.status}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-500 uppercase tracking-tighter mb-2">
                                                To: {letter.branch.nameEn} • {letter.period}
                                            </p>
                                            <p className="text-gray-600 line-clamp-2 max-w-2xl">{letter.contentEn}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col space-y-2 items-end">
                                        <div className="text-xs text-gray-400 font-medium">{format(new Date(letter.createdAt), 'dd MMM yyyy')}</div>
                                        <button
                                            onClick={() => setSelectedLetter(letter)}
                                            className="text-bank-navy text-sm font-bold flex items-center hover:underline"
                                        >
                                            <FileText size={16} className="mr-1" /> View Document
                                        </button>
                                        {letter.status === 'DRAFT' && (
                                            <button
                                                onClick={() => updateStatus(letter.id, 'SENT')}
                                                className="text-bank-teal text-sm font-bold flex items-center hover:underline"
                                            >
                                                Send to Branch <ChevronRight size={16} />
                                            </button>
                                        )}
                                        {letter.status === 'SENT' && (
                                            <div className="flex items-center space-x-1 text-blue-500 text-xs font-bold">
                                                <RefreshCw size={14} />
                                                <span>Awaiting Ack</span>
                                            </div>
                                        )}
                                        {letter.status === 'ACKNOWLEDGED' && (
                                            <div className="flex items-center space-x-1 text-green-500 text-xs font-bold">
                                                <CheckCircle size={14} />
                                                <span>Acknowledged</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-16 card border-dashed bg-gray-50">
                            <Mail className="mx-auto text-gray-300 mb-2" size={48} />
                            <p className="text-gray-500 font-medium text-lg">No letters generated yet</p>
                            <p className="text-gray-400 text-sm">Click "Generate Monthly Drafts" to start automated ranking.</p>
                        </div>
                    )}
                </div>
            )}

            {selectedLetter && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-bank-navy/60 backdrop-blur-sm overflow-y-auto pt-10 pb-10">
                    <div className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col items-center animate-in fade-in zoom-in-95 duration-200 my-auto sm:my-8">
                        <div className={`w-full p-4 text-white flex justify-between items-center ${selectedLetter.type === 'APPRECIATION' ? 'bg-green-700' : 'bg-red-700'}`}>
                            <h2 className="text-lg font-bold flex items-center">
                                {selectedLetter.type === 'APPRECIATION' ? <Award className="mr-2" size={20} /> : <AlertCircle className="mr-2" size={20} />}
                                {selectedLetter.titleEn}
                            </h2>
                            <button onClick={() => setSelectedLetter(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-gray-200 w-full flex justify-center p-4">
                            <div
                                id={`letter-content-${selectedLetter.id}`}
                                className="bg-white shadow-xl border border-gray-300 relative text-gray-800 font-sans text-[12px] leading-relaxed"
                                style={{
                                    width: '210mm',
                                    minHeight: '297mm',
                                    padding: '20mm 15mm' // Narrower standard printing margins
                                }}
                            >
                                {/* Watermark matching the UI aesthetics */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none">
                                    <img src={GLOBAL_CONFIG.watermarkLogo} alt="Watermark" className="w-[500px]" />
                                </div>

                                <div className="relative z-10 h-full flex flex-col">
                                    {/* TRILINGUAL HEADER BLOCK */}
                                    <div className="flex flex-col border-b-[1.5px] border-bank-navy pb-3 mb-6">
                                        {/* Top Row: Logo & Bank Name (Left Aligned & Smaller) */}
                                        <div className="flex items-center space-x-5 mb-8">
                                            <img src={THEME_CONFIG.logos.emblem} alt="Bank Logo" className="h-[65px] w-[65px] object-contain" />
                                            <div className="flex flex-col justify-center gap-1 py-1">
                                                <h1 className="font-extrabold text-[17px] text-bank-navy font-hindi leading-none">{(selectedLetter.orgMeta as any)?.bankNameHi || metadata.organization?.bankNameHi || GLOBAL_CONFIG.bankNameHi}</h1>
                                                <h1 className="font-extrabold text-[16px] text-bank-navy font-tamil leading-none">{(selectedLetter.orgMeta as any)?.bankNameTa || metadata.organization?.bankNameTa || GLOBAL_CONFIG.bankNameTa}</h1>
                                                <h1 className="font-bold text-[17px] text-bank-navy font-arial leading-none capitalize">{((selectedLetter.orgMeta as any)?.bankNameEn || metadata.organization?.bankNameEn || GLOBAL_CONFIG.bankName).toLowerCase()}</h1>
                                            </div>
                                        </div>

                                        {/* Bottom Row: 3 Equi-width Columns (Language per column) */}
                                        <div className="w-full grid grid-cols-3 text-bank-navy mt-4">
                                            {/* Column 1: Hindi */}
                                            <div className="flex flex-col items-center gap-1.5 pr-2">
                                                <p className="font-hindi font-bold text-[13px] text-center leading-tight flex-shrink-0">{(selectedLetter.orgMeta as any)?.officeNameHi || metadata.organization?.officeNameHi || REGIONAL_OFFICE_DATA.nameHi}</p>
                                                <p className="font-hindi font-medium text-[12px] leading-relaxed opacity-90 text-center">{(selectedLetter.orgMeta as any)?.addressHi || "क्षेत्रीय कार्यालय, 123 मदुरै रोड, डिंडीगुल - 624001, तमिलनाडु"}</p>
                                            </div>

                                            {/* Column 2: Tamil */}
                                            <div className="flex flex-col items-center gap-1.5 px-2 border-l border-bank-navy/20 min-w-0">
                                                <p className="font-tamil font-bold text-[12px] text-center leading-tight flex-shrink-0 whitespace-normal">{(selectedLetter.orgMeta as any)?.officeNameTa || metadata.organization?.officeNameTa || REGIONAL_OFFICE_DATA.nameTa}</p>
                                                <p className="font-tamil font-medium text-[10px] leading-relaxed opacity-90 text-center">{(selectedLetter.orgMeta as any)?.addressTa || "மண்டல அலுவலகம், 123 மதுரை ரோடு, திண்டுக்கல் - 624001, தமிழ்நாடு"}</p>
                                            </div>

                                            {/* Column 3: English */}
                                            <div className="flex flex-col items-center gap-1.5 pl-2 border-l border-bank-navy/20">
                                                <p className="font-bold capitalize text-[12px] text-center leading-tight flex-shrink-0">{((selectedLetter.orgMeta as any)?.officeNameEn || metadata.organization?.officeNameEn || REGIONAL_OFFICE_DATA.name).toLowerCase()}</p>
                                                <p className="font-medium text-[11px] leading-relaxed opacity-90 text-center">{(selectedLetter.orgMeta as any)?.address || metadata.organization?.address || REGIONAL_OFFICE_DATA.address}</p>
                                            </div>
                                        </div>

                                        {/* Contact Info Row */}
                                        <div className="w-full flex justify-center items-center text-[11.5px] font-bold mt-3 pt-2 border-t border-bank-navy/10 gap-8 text-bank-navy">
                                            <p className="flex items-center gap-1"><span className="opacity-75">Phone:</span> {(selectedLetter.orgMeta as any)?.phone || metadata.organization?.phone || REGIONAL_OFFICE_DATA.phone}</p>
                                            <p className="flex items-center gap-1"><span className="opacity-75">Email:</span> {(selectedLetter.orgMeta as any)?.email || metadata.organization?.email || REGIONAL_OFFICE_DATA.email}</p>
                                        </div>
                                    </div>

                                    <div className="text-right mb-10 text-[11.5px] font-bold text-gray-800">
                                        <span className="font-hindi text-[12.5px]">दिनांक</span> / <span className="font-tamil text-[10.5px]">தேதி</span> / Date: {format(new Date(selectedLetter.createdAt), 'dd.MM.yyyy')}
                                    </div>

                                    <div className="mb-10 text-justify">
                                        <p className="font-bold mb-1">To,</p>
                                        {selectedLetter.branch.headUser ? (
                                            <div className="flex flex-col gap-0.5">
                                                {/* Trilingual Manager Name with Salutation */}
                                                <p className="font-bold">
                                                    {selectedLetter.branch.headUser.fullNameHi && <span className="font-hindi text-[13px]">{selectedLetter.branch.headUser.gender === 'F' ? 'श्रीमती. ' : 'श्री. '}{selectedLetter.branch.headUser.fullNameHi} / </span>}
                                                    {selectedLetter.branch.headUser.fullNameTa && <span className="font-tamil text-[11px]">{selectedLetter.branch.headUser.gender === 'F' ? 'திருமதி. ' : 'திரு. '}{selectedLetter.branch.headUser.fullNameTa} / </span>}
                                                    <span>{selectedLetter.branch.headUser.gender === 'F' ? 'Smt. ' : 'Shri. '}{toTitleCase(selectedLetter.branch.headUser.fullNameEn)}</span>
                                                </p>

                                                {/* Trilingual Designation */}
                                                <p className="font-bold">
                                                    {selectedLetter.branch.headUser.designation?.nameHi && <span className="font-hindi text-[13px]">{selectedLetter.branch.headUser.designation.nameHi} / </span>}
                                                    {selectedLetter.branch.headUser.designation?.nameTa && <span className="font-tamil text-[11px]">{selectedLetter.branch.headUser.designation.nameTa} / </span>}
                                                    <span>{toTitleCase(selectedLetter.branch.headUser.designation?.nameEn || 'Branch Head')}</span>
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="font-bold mb-1">The Branch Manager</p>
                                        )}

                                        <div className="mt-1">
                                            <p className="capitalize">{(metadata.organization?.bankNameEn || GLOBAL_CONFIG.bankName).toLowerCase()}</p>
                                            <p className="font-bold">{selectedLetter.branch.nameEn} Branch</p>
                                        </div>
                                    </div>

                                    <h3 className="text-center font-bold text-xl underline mb-10 uppercase tracking-wider text-bank-navy">
                                        {selectedLetter.titleEn}
                                    </h3>

                                    <div className="text-justify text-gray-800 flex-grow">
                                        {selectedLetter.contentEn.split('\n\n').map((paragraph: string, i: number) => {
                                            if (paragraph.trim() === '[PERFORMANCE_TABLE]') {
                                                const pd = (selectedLetter.orgMeta as any)?.performanceData;
                                                if (!pd) return null;

                                                const fyGrowth = pd.latest - pd.march31st;

                                                return (
                                                    <div key={i} className="my-6 px-4">
                                                        <table className="w-full text-center border-collapse border border-bank-navy/40">
                                                            <thead>
                                                                <tr className="bg-bank-navy/5 text-bank-navy font-bold text-[10px] uppercase tracking-wider">
                                                                    <th className="border border-bank-navy/40 py-2 px-2">{pd.march31stDate ? format(new Date(pd.march31stDate), 'dd.MM.yyyy') : 'March 31st'} Actuals</th>
                                                                    <th className="border border-bank-navy/40 py-2 px-2">{pd.latestDate ? format(new Date(pd.latestDate), 'dd.MM.yyyy') : 'Latest'} Actuals</th>
                                                                    <th className="border border-bank-navy/40 py-2 px-2">FY Growth</th>
                                                                    <th className="border border-bank-navy/40 py-2 px-2">{pd.latestDate ? format(new Date(pd.latestDate), 'dd.MM.yyyy') : 'Latest'} Budget</th>
                                                                    <th className="border border-bank-navy/40 py-2 px-2">Gap to Budget</th>
                                                                    <th className="border border-bank-navy/40 py-2 px-2">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr className="text-sm">
                                                                    <td className="border border-bank-navy/40 py-2 px-2">₹ {pd.march31st.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr</td>
                                                                    <td className="border border-bank-navy/40 py-2 px-2 font-bold text-bank-navy">₹ {pd.latest.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr</td>
                                                                    <td className={`border border-bank-navy/40 py-2 px-2 font-bold ${fyGrowth < 0 ? 'text-red-700' : 'text-green-700'}`}>
                                                                        {fyGrowth < 0 ? '-' : '+'}₹ {Math.abs(fyGrowth).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr
                                                                    </td>
                                                                    <td className="border border-bank-navy/40 py-2 px-2">₹ {pd.budget.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr</td>

                                                                    <td className={`border border-bank-navy/40 py-2 px-2 font-bold ${pd.status === '-ve' ? 'text-red-700' : 'text-green-700'}`}>
                                                                        {pd.gap < 0 ? '-' : '+'}₹ {Math.abs(pd.gap).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr
                                                                    </td>
                                                                    <td className={`border border-bank-navy/40 py-2 px-2 font-bold ${pd.status === '-ve' ? 'text-red-700' : 'text-green-700'}`}>
                                                                        {pd.status === '-ve' ? 'SHORTFALL' : 'ACHIEVED'}
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <p key={i} className="mb-4 leading-relaxed">
                                                    {paragraph}
                                                </p>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-20 flex justify-end">
                                        <div className="text-center inline-block min-w-[220px]">
                                            {/* Signature Line at the Top */}
                                            <div className="border-t-[1.5px] border-gray-400 mb-1 pt-1"></div>

                                            {/* Signatory Name - CamelCase & Parenthesis */}
                                            <div className="mb-1">
                                                <p className="font-bold text-bank-navy text-[15px]">
                                                    ({toTitleCase((selectedLetter.orgMeta as any)?.signatoryName || metadata.organization?.signatoryName || metadata.regionHeadName)})
                                                </p>
                                            </div>

                                            {/* Trilingual Sign Off Titles - Below Name */}
                                            <div className="flex flex-col gap-1">
                                                <p className="font-bold text-sm font-hindi text-bank-navy">{(selectedLetter.orgMeta as any)?.signingAuthHi || metadata.organization?.signingAuthHi || REGIONAL_OFFICE_DATA.signingAuthHi}</p>
                                                <p className="font-bold text-[11px] font-tamil text-bank-navy">{(selectedLetter.orgMeta as any)?.signingAuthTa || metadata.organization?.signingAuthTa || REGIONAL_OFFICE_DATA.signingAuthTa}</p>
                                                <p className="font-bold text-[12px] text-bank-navy capitalize">{((selectedLetter.orgMeta as any)?.signingAuthEn || metadata.organization?.signingAuthEn || REGIONAL_OFFICE_DATA.signingAuthEn).toLowerCase()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-white flex justify-end space-x-3 items-center">
                            {/* Upload / View Scanned Copy Section */}
                            {(selectedLetter.orgMeta as any)?.scannedCopyUrl || (selectedLetter as any).scannedCopyUrl ? (
                                <a
                                    href={(selectedLetter.orgMeta as any)?.scannedCopyUrl || (selectedLetter as any).scannedCopyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 text-bank-teal font-bold bg-bank-teal/10 hover:bg-bank-teal/20 rounded-lg transition-colors flex items-center mr-auto"
                                >
                                    <FileText size={18} className="mr-2" /> View Signed Copy
                                </a>
                            ) : (
                                <div className="mr-auto flex items-center">
                                    <input
                                        type="file"
                                        id={`upload-scan-${selectedLetter.id}`}
                                        className="hidden"
                                        accept="application/pdf,image/*"
                                        onChange={(e) => handleUploadScan(selectedLetter.id, e)}
                                    />
                                    <label
                                        htmlFor={`upload-scan-${selectedLetter.id}`}
                                        className={`px-4 py-2 text-bank-navy font-bold border border-bank-navy/30 hover:bg-bank-navy/5 rounded-lg transition-colors flex items-center cursor-pointer ${uploadingId === selectedLetter.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <Award size={18} className="mr-2" />
                                        {uploadingId === selectedLetter.id ? 'Uploading...' : 'Upload Signed Copy'}
                                    </label>
                                </div>
                            )}

                            <button
                                onClick={() => handleDownloadPdf(selectedLetter.id, selectedLetter.titleEn)}
                                className="px-6 py-2 text-bank-navy font-bold hover:bg-bank-navy/5 border border-bank-navy/20 rounded-lg transition-colors flex items-center"
                            >
                                <Award size={18} className="mr-2 opacity-0 w-0" /> {/* Spacer to align nicely */}
                                Download PDF
                            </button>

                            <button
                                onClick={() => setSelectedLetter(null)}
                                className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            {selectedLetter.status === 'DRAFT' && (
                                <button
                                    onClick={() => {
                                        updateStatus(selectedLetter.id, 'SENT');
                                        setSelectedLetter(null);
                                    }}
                                    className="bg-bank-teal text-white px-6 py-2 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-md flex items-center"
                                >
                                    Approve & Send to Branch <ChevronRight size={18} className="ml-1" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CorrespondenceCenter;
