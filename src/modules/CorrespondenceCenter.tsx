import React, { useState, useEffect } from 'react';
import { Mail, Award, AlertCircle, RefreshCw, CheckCircle, ChevronRight, X, FileText, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { parseLocalISO } from '../utils/dateUtils';
import api from '../services/api';
import { REGIONAL_OFFICE_DATA, GLOBAL_CONFIG, THEME_CONFIG } from '../constants/organization';
import { useAuth } from '../context/AuthContext';
import LetterComposer from './LetterComposer';

interface Letter {
    id: string;
    type: 'APPRECIATION' | 'EXPLANATION' | 'OP_RISK' | 'MANUAL';
    status: 'DRAFT' | 'SENT' | 'ACKNOWLEDGED';
    titleEn: string;
    titleHi?: string | null;
    titleTa?: string | null;
    contentEn: string;
    contentHi?: string | null;
    contentTa?: string | null;
    branch: {
        nameEn: string;
        type: string;
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
    parameterId?: string;
    createdAt: string;
    orgMeta?: any;
    scannedCopyUrl?: string; // Correctly define here
}

const CorrespondenceCenter: React.FC = () => {
    const { user } = useAuth();
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
    const [activeTab, setActiveTab] = useState<'PERFORMANCE' | 'OP_RISK' | 'MANUAL'>('PERFORMANCE');
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [showComposer, setShowComposer] = useState(false);

    const toTitleCase = (str: string) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const handleDownloadPdf = async (letterId: string, title: string) => {
        try {
            const response = await api.get(`/letters/${letterId}/pdf`, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/\s+/g, '_')}_${format(new Date(), 'ddMMyyyy')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Failed to download PDF:', error);
            alert(`Failed to download PDF. Error: ${error?.response?.data?.error || error?.message || 'Unknown error'}`);
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

    const [generateResult, setGenerateResult] = useState<{
        message: string;
        created: number;
        skipped: number;
        details: { branch: string; param: string; type: string; reason: string }[];
    } | null>(null);

    const handleGenerate = async () => {
        setGenerating(true);
        setGenerateResult(null);
        try {
            const dateObj = parseLocalISO(selectedDate) || new Date();
            const response = await api.post('/letters/generate', {
                period: format(dateObj, 'MMM yyyy'),
                date: selectedDate,
                type: activeTab
            });
            setGenerateResult(response.data);
            fetchLetters();
        } catch (error: any) {
            alert(`Generation failed: ${error?.response?.data?.error || error.message}`);
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
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy">Correspondence Center</h2>
                    <p className="text-gray-500">Manage formal letters and advisories</p>
                </div>

                <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('PERFORMANCE')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center space-x-2 ${activeTab === 'PERFORMANCE'
                            ? 'bg-white text-bank-navy shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Award size={16} />
                        <span>Performance Assessment</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('OP_RISK')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center space-x-2 ${activeTab === 'OP_RISK'
                            ? 'bg-white text-bank-navy shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <TrendingUp size={16} />
                        <span>Operational Risk</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('MANUAL')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center space-x-2 ${activeTab === 'MANUAL'
                            ? 'bg-white text-bank-navy shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <FileText size={16} />
                        <span>Manual Drafts</span>
                    </button>
                </div>
            </div>

            {/* Controls Section */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setShowComposer(true)}
                        className="btn-outline flex items-center space-x-2 border-bank-navy text-bank-navy px-6 py-2.5 rounded-lg font-bold hover:bg-bank-navy/5 transition-all"
                    >
                        <FileText size={18} />
                        <span>Compose Manual Letter</span>
                    </button>

                    {(user?.role === 'ADMIN' || (user?.role === 'RO_USER' && user?.section === 'Planning')) && activeTab !== 'MANUAL' && (
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="btn-primary flex items-center justify-center space-x-2 bg-bank-navy text-white px-6 py-2.5 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={generating ? 'animate-spin' : ''} />
                            <span>{generating ? 'Generating Documents...' : `Generate ${activeTab === 'PERFORMANCE' ? 'Performance' : 'OpRisk'} Drafts`}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Generation Results Modal/Alert */}
            {generateResult && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-start mb-2">
                        <p className="font-bold text-green-800">{generateResult?.message}</p>
                        <button onClick={() => setGenerateResult(null)} className="text-green-600 hover:text-green-800 p-1">
                            <X size={16} />
                        </button>
                    </div>
                    {generateResult?.details && generateResult.details.length > 0 && (
                        <div className="overflow-auto max-h-48 custom-scrollbar">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-green-700 font-bold uppercase tracking-wider sticky top-0 bg-green-50">
                                        <th className="text-left py-1 pr-4">Branch</th>
                                        <th className="text-left py-1 pr-4">Parameter</th>
                                        <th className="text-left py-1 pr-4">Type</th>
                                        <th className="text-left py-1">Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {generateResult.details.map((d, i) => (
                                        <tr key={i} className="border-t border-green-100/50 text-gray-700">
                                            <td className="py-1 pr-4">{d.branch}</td>
                                            <td className="py-1 pr-4 font-mono">{d.param}</td>
                                            <td className={`py-1 pr-4 font-bold ${d.type === 'APPRECIATION' ? 'text-green-700' :
                                                    d.type === 'EXPLANATION' ? 'text-red-700' :
                                                        d.type === 'OP_RISK' ? 'text-orange-700' : 'text-gray-400'
                                                }`}>{d.type}</td>
                                            <td className="py-1 text-gray-500">{d.reason}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Letters List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bank-navy"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {letters
                        .filter(l => {
                            if (activeTab === 'PERFORMANCE') return l.type === 'APPRECIATION' || l.type === 'EXPLANATION';
                            if (activeTab === 'MANUAL') return l.type === 'MANUAL';
                            return l.type === 'OP_RISK';
                        })
                        .length > 0 ? (
                        letters
                            .filter(l => {
                                if (activeTab === 'PERFORMANCE') return l.type === 'APPRECIATION' || l.type === 'EXPLANATION';
                                if (activeTab === 'MANUAL') return l.type === 'MANUAL';
                                return l.type === 'OP_RISK';
                            })
                            .map(letter => (
                                <div key={letter.id} className="card p-6 bg-white border border-gray-100 hover:shadow-lg transition-all group rounded-xl shadow-sm">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-4">
                                            <div className={`p-3 rounded-xl ${letter.type === 'APPRECIATION' ? 'bg-green-100 text-green-700' :
                                                letter.type === 'OP_RISK' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {letter.type === 'APPRECIATION' ? <Award size={24} /> :
                                                    letter.type === 'OP_RISK' ? <TrendingUp size={24} /> :
                                                        <AlertCircle size={24} />}
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
                                        </div>
                                    </div>
                                </div>
                            ))
                    ) : (
                        <div className="text-center py-16 card border-dashed border-2 bg-gray-50/50 rounded-2xl">
                            <Mail className="mx-auto text-gray-300 mb-4" size={64} />
                            <p className="text-gray-500 font-bold text-xl">No {activeTab === 'PERFORMANCE' ? 'performance letters' : 'risk advisories'} found</p>
                            <p className="text-gray-400 text-sm mt-1">Select a date and click generate to create automated drafts.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Letter Preview Modal */}
            {selectedLetter && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-bank-navy/60 backdrop-blur-sm overflow-y-auto pt-10 pb-10">
                    <div className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col items-center animate-in fade-in zoom-in-95 duration-200 my-auto sm:my-8 max-w-5xl w-full">
                        <div className={`w-full p-4 text-white flex justify-between items-center ${selectedLetter.type === 'APPRECIATION' ? 'bg-green-700' :
                                selectedLetter.type === 'OP_RISK' ? 'bg-orange-700' :
                                    'bg-red-700'
                            }`}>
                            <h2 className="text-lg font-bold flex items-center">
                                {selectedLetter.type === 'APPRECIATION' ? <Award className="mr-2" size={20} /> :
                                    selectedLetter.type === 'OP_RISK' ? <TrendingUp className="mr-2" size={20} /> :
                                        <AlertCircle className="mr-2" size={20} />}
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
                                    padding: '20mm 15mm',
                                    position: 'relative'
                                }}
                            >
                                {selectedLetter.type === 'OP_RISK' && (
                                    <>
                                        <div className="absolute top-0 left-0 right-0 h-[6px] bg-red-600 z-[100]" />
                                        <div className="absolute top-4 right-4 bg-red-50 border border-red-600 text-red-600 px-3 py-1 rounded-md font-black text-[10px] flex items-center gap-1.5 z-[101] tracking-wider uppercase">
                                            <span>⚠️</span> HIGH RISK ADVISORY
                                        </div>
                                    </>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none">
                                    <img src={GLOBAL_CONFIG.watermarkLogo} alt="Watermark" className="w-[500px]" />
                                </div>

                                <div className="relative z-10 h-full flex flex-col">
                                    <div className="flex flex-col border-b-[1.5px] border-bank-navy pb-3 mb-4">
                                        <div className="flex items-center space-x-5 mb-4">
                                            <img src={THEME_CONFIG.logos.emblem} alt="Bank Logo" className="h-[60px] w-[60px] object-contain" />
                                            <div className="flex flex-col justify-center gap-0.5 py-1">
                                                <h1 className="font-extrabold text-[16px] text-bank-navy font-hindi leading-none">{(selectedLetter?.orgMeta as any)?.bankNameHi || metadata.organization?.bankNameHi || GLOBAL_CONFIG.bankNameHi}</h1>
                                                <h1 className="font-extrabold text-[15px] text-bank-navy font-tamil leading-none">{(selectedLetter?.orgMeta as any)?.bankNameTa || metadata.organization?.bankNameTa || GLOBAL_CONFIG.bankNameTa}</h1>
                                                <h1 className="font-bold text-[16px] text-bank-navy font-arial leading-none capitalize">{((selectedLetter?.orgMeta as any)?.bankNameEn || metadata.organization?.bankNameEn || GLOBAL_CONFIG.bankName).toLowerCase()}</h1>
                                            </div>
                                        </div>
 
                                        <div className="w-full grid grid-cols-3 text-bank-navy mt-2">
                                            <div className="flex flex-col items-center gap-1 pr-2">
                                                <p className="font-hindi font-bold text-[12px] text-center leading-tight flex-shrink-0">{(selectedLetter?.orgMeta as any)?.officeNameHi || metadata.organization?.officeNameHi || REGIONAL_OFFICE_DATA.nameHi}</p>
                                                <p className="font-hindi font-medium text-[11px] leading-relaxed opacity-90 text-center">{(selectedLetter?.orgMeta as any)?.addressHi || "क्षेत्रीय कार्यालय, 123 मदुरै रोड, डिंडीगुल - 624001, तमिलनाडु"}</p>
                                            </div>

                                            <div className="flex flex-col items-center gap-1 px-2 border-l border-bank-navy/20 min-w-0">
                                                <p className="font-tamil font-bold text-[11px] text-center leading-tight flex-shrink-0 whitespace-normal">{(selectedLetter.orgMeta as any)?.officeNameTa || metadata.organization?.officeNameTa || REGIONAL_OFFICE_DATA.nameTa}</p>
                                                <p className="font-tamil font-medium text-[9px] leading-relaxed opacity-90 text-center">{(selectedLetter.orgMeta as any)?.addressTa || "மண்டல அலுவலகம், 123 மதுரை ரோடு, திண்டுக்கல் - 624001, தமிழ்நாடு"}</p>
                                            </div>

                                            <div className="flex flex-col items-center gap-1 pl-2 border-l border-bank-navy/20">
                                                <p className="font-bold capitalize text-[11px] text-center leading-tight flex-shrink-0">{((selectedLetter.orgMeta as any)?.officeNameEn || metadata.organization?.officeNameEn || REGIONAL_OFFICE_DATA.name).toLowerCase()}</p>
                                                <p className="font-medium text-[10px] leading-relaxed opacity-90 text-center">{(selectedLetter.orgMeta as any)?.address || metadata.organization?.address || REGIONAL_OFFICE_DATA.address}</p>
                                            </div>
                                        </div>

                                        <div className="w-full flex justify-center items-center text-[10.5px] font-bold mt-2 pt-1.5 border-t border-bank-navy/10 gap-6 text-bank-navy">
                                            <p className="flex items-center gap-1"><span className="opacity-75">Phone:</span> {(selectedLetter.orgMeta as any)?.phone || metadata.organization?.phone || REGIONAL_OFFICE_DATA.phone}</p>
                                            <p className="flex items-center gap-1"><span className="opacity-75">Email:</span> {(selectedLetter.orgMeta as any)?.email || metadata.organization?.email || REGIONAL_OFFICE_DATA.email}</p>
                                        </div>
                                    </div>

                                    <div className="text-right mb-6 text-[11px] font-bold text-gray-800">
                                        <span className="font-hindi text-[12px]">दिनांक</span> / <span className="font-tamil text-[10px]">தேதி</span> / Date: {format(new Date(selectedLetter.createdAt), 'dd.MM.yyyy')}
                                    </div>

                                    <div className="mb-6 text-justify">
                                        <p className="font-bold mb-0.5">To,</p>
                                        {selectedLetter?.branch?.headUser ? (
                                            <div className="flex flex-col gap-0">
                                                <p className="font-bold">
                                                    {selectedLetter.branch.headUser.fullNameHi && <span className="font-hindi text-[12px]">{selectedLetter.branch.headUser.gender === 'F' ? 'श्रीमती. ' : 'श्री. '}{selectedLetter.branch.headUser.fullNameHi} / </span>}
                                                    {selectedLetter.branch.headUser.fullNameTa && <span className="font-tamil text-[10px]">{selectedLetter.branch.headUser.gender === 'F' ? 'திருமதி. ' : 'திரு. '}{selectedLetter.branch.headUser.fullNameTa} / </span>}
                                                    <span>{selectedLetter.branch.headUser.gender === 'F' ? 'Smt. ' : 'Shri. '}{toTitleCase(selectedLetter.branch.headUser.fullNameEn)}</span>
                                                </p>
                                                <p className="font-bold">
                                                    {selectedLetter.branch.headUser.designation?.nameHi && <span className="font-hindi text-[12px]">{selectedLetter.branch.headUser.designation.nameHi} / </span>}
                                                    {selectedLetter.branch.headUser.designation?.nameTa && <span className="font-tamil text-[10px]">{selectedLetter.branch.headUser.designation.nameTa} / </span>}
                                                    <span>{toTitleCase(selectedLetter.branch.headUser.designation?.nameEn || 'Branch Head')}</span>
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="font-bold mb-0.5">The Branch Manager</p>
                                        )}
                                        <div className="mt-0.5 text-[11px]">
                                            <p className="capitalize">{(metadata?.organization?.bankNameEn || GLOBAL_CONFIG.bankName).toLowerCase()}</p>
                                            <p className="font-bold">{selectedLetter?.branch?.nameEn} Branch</p>
                                        </div>
                                    </div>

                                    <h3 className="text-center font-bold text-lg underline mb-6 uppercase tracking-wider text-bank-navy">
                                        {selectedLetter.titleEn}
                                    </h3>

                                    <div className="text-justify text-gray-800 flex-grow">
                                        {selectedLetter.contentHi && (
                                            <p className="font-hindi text-[13px] mb-4 leading-relaxed text-justify">
                                                {selectedLetter.contentHi}
                                            </p>
                                        )}
                                        {selectedLetter.contentTa && (
                                            <p className="font-tamil text-[11px] mb-4 leading-relaxed text-justify">
                                                {selectedLetter.contentTa}
                                            </p>
                                        )}
                                        {(() => {
                                            const isBranch = selectedLetter.branch?.type !== 'REGIONAL OFFICE';
                                        const scale = isBranch ? 100 : 1;
                                        const unitLabel = isBranch ? 'Lakhs' : 'Cr';

                                        const letter = selectedLetter;
                                        return letter.contentEn.split('\n\n').map((paragraph: string, i: number) => {
                                            if (paragraph.trim() === '[PERFORMANCE_TABLE]') {
                                                const pd = (letter.orgMeta as any)?.performanceData;
                                                if (!pd) return null;
                                                const fyGrowth = pd.latest - pd.march31st;
                                                const forceInverted = String(letter.titleEn).toUpperCase().includes('NPA') || 
                                                                    String(letter.parameterId).toUpperCase().includes('NPA') || 
                                                                    pd.isInverted === true;
                                                const isAchieved = forceInverted ? (pd.latest <= pd.budget) : (pd.latest >= pd.budget);
                                                const gapLabel = forceInverted ? (pd.latest <= pd.budget ? 'Reduction' : 'Overrun') : (pd.latest >= pd.budget ? 'Surplus' : 'Shortfall');
                                                const statusLabel = isAchieved ? 'ACHIEVED' : 'SHORTFALL';
                                                const statusColor = isAchieved ? 'text-green-700' : 'text-red-700';

                                                return (
                                                    <div key={i} className="my-6 px-4">
                                                        <table className="w-full text-center border-collapse border border-bank-navy/40">
                                                            <thead>
                                                                <tr className="bg-bank-navy/5 text-bank-navy font-bold text-[10px] uppercase tracking-wider">
                                                                    <th className="border border-bank-navy/40 py-2 px-2">{pd.march31stDate ? format(parseLocalISO(pd.march31stDate) || new Date(), 'dd.MM.yyyy') : 'March 31st'} Actuals</th>
                                                                    <th className="border border-bank-navy/40 py-2 px-2">{pd.latestDate ? format(parseLocalISO(pd.latestDate) || new Date(), 'dd.MM.yyyy') : 'Latest'} Actuals</th>
                                                                    <th className="border border-bank-navy/40 py-2 px-2">FY Growth</th>
                                                                    <th className="border border-bank-navy/40 py-2 px-2">{pd.latestDate ? format(parseLocalISO(pd.latestDate) || new Date(), 'dd.MM.yyyy') : 'Latest'} Budget</th>
                                                                    <th className="border border-bank-navy/40 py-2 px-2">Gap to Budget</th>
                                                                    <th className="border border-bank-navy/40 py-2 px-2">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr className="text-sm">
                                                                    <td className="border border-bank-navy/40 py-2 px-2">₹ {(pd.march31st * scale).toLocaleString('en-IN', { maximumFractionDigits: 2 })} {unitLabel}</td>
                                                                    <td className="border border-bank-navy/40 py-2 px-2 font-bold text-bank-navy">₹ {(pd.latest * scale).toLocaleString('en-IN', { maximumFractionDigits: 2 })} {unitLabel}</td>
                                                                    <td className={`border border-bank-navy/40 py-2 px-2 font-bold ${fyGrowth < 0 ? 'text-red-700' : 'text-green-700'}`}>
                                                                        {fyGrowth < 0 ? '-' : '+'}₹ {Math.abs(fyGrowth * scale).toLocaleString('en-IN', { maximumFractionDigits: 2 })} {unitLabel}
                                                                    </td>
                                                                    <td className="border border-bank-navy/40 py-2 px-2">₹ {(pd.budget * scale).toLocaleString('en-IN', { maximumFractionDigits: 2 })} {unitLabel}</td>
                                                                    <td className={`border border-bank-navy/40 py-2 px-2 font-bold ${statusColor}`}>
                                                                        {pd.gap < 0 ? '-' : '+'}₹ {Math.abs(pd.gap * scale).toLocaleString('en-IN', { maximumFractionDigits: 2 })} {unitLabel}<br/>
                                                                        <span className="text-[10px]">({gapLabel})</span>
                                                                    </td>
                                                                    <td className={`border border-bank-navy/40 py-2 px-2 font-bold ${statusColor}`}>
                                                                        {statusLabel}
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                );
                                            }

                                                if (paragraph.trim() === '[EXCEPTION_TABLE]') {
                                                    const exceptions = (letter.orgMeta as any)?.exceptions || [];
                                                    if (exceptions.length === 0) return <p key={i} className="text-gray-400 italic">No critical exceptions noted.</p>;
                                                    return (
                                                        <div key={i} className="my-6">
                                                            <table className="w-full border-collapse border border-bank-navy/40 text-[11px]">
                                                                <thead>
                                                                    <tr className="bg-bank-navy/5 text-bank-navy font-bold uppercase">
                                                                        <th className="border border-bank-navy/40 py-2 px-2 text-left w-20">Rule ID</th>
                                                                        <th className="border border-bank-navy/40 py-2 px-2 text-left w-32">Parameter</th>
                                                                        <th className="border border-bank-navy/40 py-2 px-2 text-left">Observation</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {exceptions.map((ex: any, idx: number) => (
                                                                        <tr key={idx}>
                                                                            <td className="border border-bank-navy/40 py-2 px-2 font-mono">{ex.ruleId || 'N/A'}</td>
                                                                            <td className="border border-bank-navy/40 py-2 px-2 font-bold">{ex.parameter}</td>
                                                                            <td className="border border-bank-navy/40 py-2 px-2 text-red-700">{ex.message}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    );
                                                }

                                                if (paragraph.trim() === '[MOVEMENT_TABLE]') {
                                                    const movement = (letter.orgMeta as any)?.dailyMovement || [];
                                                    if (movement.length === 0) return null;
                                                    return (
                                                        <div key={i} className="my-6">
                                                            <table className="w-full border-collapse border border-bank-navy/40 text-[11px]">
                                                                <thead>
                                                                    <tr className="bg-bank-navy/5 text-bank-navy font-bold uppercase">
                                                                        <th className="border border-bank-navy/40 py-2 px-2 text-left">Parameter</th>
                                                                        <th className="border border-bank-navy/40 py-2 px-2 text-right">Previous Day</th>
                                                                        <th className="border border-bank-navy/40 py-2 px-2 text-right">Latest Report</th>
                                                                        <th className="border border-bank-navy/40 py-2 px-2 text-right">Movement</th>
                                                                        <th className="border border-bank-navy/40 py-2 px-2 text-right">% Change</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {movement.map((m: any, idx: number) => (
                                                                        <tr key={idx}>
                                                                            <td className="border border-bank-navy/40 py-2 px-2 font-bold">{m.parameter}</td>
                                                                            <td className="border border-bank-navy/40 py-2 px-2 text-right">₹ {(Number(m.previousValue) * scale).toLocaleString('en-IN', { maximumFractionDigits: 2 })} {unitLabel}</td>
                                                                            <td className="border border-bank-navy/40 py-2 px-2 text-right font-bold text-bank-navy">₹ {(Number(m.latestValue) * scale).toLocaleString('en-IN', { maximumFractionDigits: 2 })} {unitLabel}</td>
                                                                            <td className={`border border-bank-navy/40 py-2 px-2 text-right font-bold ${m.movement > 0 ? 'text-green-700' : m.movement < 0 ? 'text-red-700' : 'text-gray-600'}`}>
                                                                                {m.movement > 0 ? '+' : ''}₹ {(Number(m.movement) * scale).toLocaleString('en-IN', { maximumFractionDigits: 2 })} {unitLabel}
                                                                            </td>
                                                                            <td className={`border border-bank-navy/40 py-2 px-2 text-right font-bold ${m.pct > 0 ? 'text-green-700' : m.pct < 0 ? 'text-red-700' : 'text-gray-600'}`}>
                                                                                {m.pct > 0 ? '+' : ''}{Number(m.pct).toFixed(2)}%
                                                                            </td>
                                                                        </tr>
                                                                    ))}
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
                                            });
                                        })()}
                                    </div>

                                    <div className="mt-8 flex justify-end">
                                        <div className="text-center inline-block min-w-[200px]">
                                            <div className="border-t-[1.5px] border-gray-400 mb-1 pt-1"></div>
                                            <div className="mb-0.5">
                                                <p className="font-bold text-bank-navy text-[13px]">
                                                    ({selectedLetter?.type === 'OP_RISK' ? 'Niraj Kumar' : toTitleCase((selectedLetter?.orgMeta as any)?.signatoryName || metadata?.organization?.signatoryName || metadata?.regionHeadName)})
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <p className="font-bold text-[12px] font-hindi text-bank-navy">{selectedLetter?.type === 'OP_RISK' ? 'मुख्य प्रबंधक' : ((selectedLetter?.orgMeta as any)?.signingAuthHi || metadata?.organization?.signingAuthHi || REGIONAL_OFFICE_DATA.signingAuthHi)}</p>
                                                <p className="font-bold text-[10px] font-tamil text-bank-navy">{selectedLetter?.type === 'OP_RISK' ? 'தலைமை மேலாளர்' : ((selectedLetter?.orgMeta as any)?.signingAuthTa || metadata?.organization?.signingAuthTa || REGIONAL_OFFICE_DATA.signingAuthTa)}</p>
                                                <p className="font-bold text-[11px] text-bank-navy capitalize">{selectedLetter?.type === 'OP_RISK' ? 'Chief Manager' : ((selectedLetter?.orgMeta as any)?.signingAuthEn || metadata?.organization?.signingAuthEn || REGIONAL_OFFICE_DATA.signingAuthEn).toLowerCase()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-white flex justify-end space-x-3 items-center">
                            {(selectedLetter.orgMeta as any)?.scannedCopyUrl || selectedLetter.scannedCopyUrl ? (
                                <a
                                    href={(selectedLetter.orgMeta as any)?.scannedCopyUrl || selectedLetter.scannedCopyUrl}
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

            {showComposer && (
                <LetterComposer 
                    onClose={() => setShowComposer(false)} 
                    onSuccess={() => {
                        setShowComposer(false);
                        fetchLetters();
                    }} 
                />
            )}
        </div>
    );
};

export default CorrespondenceCenter;
