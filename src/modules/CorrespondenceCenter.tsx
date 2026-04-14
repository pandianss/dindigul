import React, { useState, useEffect } from 'react';
import { Mail, Award, AlertCircle, RefreshCw, CheckCircle, ChevronRight, X, FileText, Calendar, TrendingUp, Database, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { parseLocalISO } from '../utils/dateUtils';
import api from '../services/api';
import { REGIONAL_OFFICE_DATA, GLOBAL_CONFIG, THEME_CONFIG } from '../constants/organization';
import { useAuth } from '../context/AuthContext';
import LetterComposer from './LetterComposer';
import { 
    Plus, Download, Clock, Trash2, ArrowLeft, 
    ArrowRight, User, MapPin, Hash, Search, 
    Table, Filter, Save
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import DocumentPreview from '../components/DocumentPreview';

interface Letter {
    id: string;
    type: 'APPRECIATION' | 'EXPLANATION' | 'OP_RISK' | 'MANUAL' | 'BUDGET_ALLOTMENT';
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
        code?: string;
        size?: string;
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
    scannedCopyUrl?: string;
    referenceNo?: string;
    contentJson?: any;
    signatory?: {
        fullNameEn: string;
        fullNameHi?: string | null;
        fullNameTa?: string | null;
        designation?: {
            nameEn: string;
            nameHi?: string | null;
            nameTa?: string | null;
        };
    } | null;
    author?: {
        fullNameEn: string;
        fullNameHi?: string | null;
        fullNameTa?: string | null;
        designationEn?: string;
        designationHi?: string | null;
        designationTa?: string | null;
    } | null;
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
            deptSealUrl?: string;
        }
    }>({
        regionHeadName: 'Regional Manager',
        regionHeadDesignation: 'Regional Manager'
    });
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'PERFORMANCE' | 'OP_RISK' | 'MANUAL' | 'BUDGET'>('PERFORMANCE');
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [showComposer, setShowComposer] = useState(false);
    const [isMovingSeal, setIsMovingSeal] = useState(false);
    const [sealPos, setSealPos] = useState({ x: 0, y: 30 });

    useEffect(() => {
        if (selectedLetter) {
            const meta = (selectedLetter.orgMeta as any) || {};
            setSealPos({ 
                x: meta.sealX ?? 0, 
                y: meta.sealY ?? 30 
            });
            setIsMovingSeal(false);
        }
    }, [selectedLetter]);

    const handleSaveSealPosition = async (pos?: { x: number, y: number }) => {
        if (!selectedLetter) return;
        if (selectedLetter.status === 'SENT') {
            alert('Cannot edit a frozen letter. Please open it for editing first.');
            setIsMovingSeal(false);
            return;
        }
        const targetPos = pos || sealPos;
        try {
            const updatedMeta = {
                ...(selectedLetter.orgMeta as any),
                sealX: targetPos.x,
                sealY: targetPos.y
            };
            await api.patch(`/letters/${selectedLetter.id}`, {
                orgMeta: updatedMeta
            });
            setSelectedLetter({ ...selectedLetter, orgMeta: updatedMeta });
            setSealPos(targetPos);
            setIsMovingSeal(false);
            alert('Seal position saved successfully.');
        } catch (error) {
            console.error('Failed to save seal position:', error);
            alert('Failed to save seal position.');
        }
    };

    // Budget Overhaul State
    const [budgetType, setBudgetType] = useState('Sundry Other Charges');
    const [strategy, setStrategy] = useState<'SIZE_BASED' | 'POPULATION_BASED' | 'UPLOAD_BASED'>('SIZE_BASED');
    const [financialYear, setFinancialYear] = useState('2026-27');
    const [emailDate, setEmailDate] = useState('07.04.2026');
    const [allotmentFile, setAllotmentFile] = useState<File | null>(null);
    const [amounts, setAmounts] = useState<Record<string, number>>({
        'Small': 90000, 'Medium': 150000, 'Large': 200000, 'Very Large': 150000, 'Extra Large': 300000,
        'RURAL': 50000, 'SEMI-URBAN': 75000, 'URBAN': 100000, 'METRO': 150000
    });
    
    // FETCH DEPARTMENTS FOR SEAL MAPPING
    const [departments, setDepartments] = useState<any[]>([]);
    const [signatories, setSignatories] = useState<any[]>([]);
    const [selectedSignatoryId, setSelectedSignatoryId] = useState<string>('');

    useEffect(() => {
        api.get('/departments').then(res => setDepartments(res.data)).catch(() => {});
        
        // Fetch authorized signatories (RO Chief Managers)
        api.get('/signatories').then(res => {
            const cms = res.data;
            setSignatories(cms);
            // Default to Annamalai if found
            const annamalai = cms.find((u: any) => u.fullNameEn?.includes('Annamalai'));
            if (annamalai) setSelectedSignatoryId(annamalai.id);
        }).catch(() => {});
    }, []);

    const [customIntro, setCustomIntro] = useState('');
    const [customOutro, setCustomOutro] = useState('');
    const [specificDirective, setSpecificDirective] = useState('');

    const toTitleCase = (str: string) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const getSelectedPeriodLabel = () => {
        const dateObj = parseLocalISO(selectedDate) || new Date();
        return format(dateObj, 'MMM yyyy');
    };

    const getSelectedCycleLabel = () => {
        if (activeTab === 'OP_RISK') {
            const dateObj = parseLocalISO(selectedDate) || new Date();
            return format(dateObj, 'dd.MM.yyyy');
        }
        if (activeTab === 'PERFORMANCE') {
            return getSelectedPeriodLabel();
        }
        return null;
    };

    const isLetterInActiveCategory = (letter: Letter) => {
        if (activeTab === 'PERFORMANCE') return letter.type === 'APPRECIATION' || letter.type === 'EXPLANATION';
        if (activeTab === 'OP_RISK') return letter.type === 'OP_RISK';
        if (activeTab === 'BUDGET') return letter.type === 'BUDGET_ALLOTMENT';
        if (activeTab === 'MANUAL') return letter.type === 'MANUAL';
        return false;
    };

    const isLetterInSelectedCycle = (letter: Letter) => {
        const cycle = getSelectedCycleLabel();
        if (!cycle) return true;
        return letter.period === cycle;
    };

    const handleBulkZipDownload = async () => {
        try {
            setGenerating(true);
            
            // Filter letters to only those belonging to the active category AND status DRAFT
            const draftIds = letters
                .filter(l => {
                    const isDraft = l.status === 'DRAFT';
                    if (!isDraft) return false;
                    return isLetterInActiveCategory(l) && isLetterInSelectedCycle(l);
                })
                .map(l => l.id);

            if (draftIds.length === 0) {
                alert(`No draft letters found for the current category (${activeTab}).`);
                setGenerating(false);
                return;
            }

            const response = await api.post(`/letters/bulk-pdf-zip`, { ids: draftIds }, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: 'application/zip' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Batch_Letters_${format(new Date(), 'ddMMyyyy_HHmm')}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Failed to download Bulk ZIP:', error);
            alert(`Failed to download ZIP. Error: ${error?.response?.data?.error || error?.message || 'Unknown error'}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleBulkFreeze = async () => {
        const draftIds = letters
            .filter(l => {
                const isDraft = l.status === 'DRAFT';
                if (!isDraft) return false;
                return isLetterInActiveCategory(l) && isLetterInSelectedCycle(l);
            })
            .map(l => l.id);

        if (draftIds.length === 0) {
            alert(`No draft letters found to freeze in the ${activeTab} category.`);
            return;
        }

        if (!window.confirm(`Are you sure you want to approve and freeze ${draftIds.length} letters? This will make them visible to branches.`)) {
            return;
        }

        try {
            setGenerating(true);
            await api.post('/letters/bulk-status', { 
                ids: draftIds, 
                status: 'SENT' 
            });
            alert(`Successfully approved ${draftIds.length} letters.`);
            fetchLetters();
        } catch (error: any) {
            console.error('Bulk freeze failed:', error);
            alert('Bulk approval failed.');
        } finally {
            setGenerating(false);
        }
    };

    const handleBulkOpen = async () => {
        const sentIds = letters
            .filter(l => {
                const isSent = l.status === 'SENT';
                if (!isSent) return false;
                return isLetterInActiveCategory(l) && isLetterInSelectedCycle(l);
            })
            .map(l => l.id);

        if (sentIds.length === 0) {
            alert(`No sent letters found to open in the ${activeTab} category.`);
            return;
        }

        if (!window.confirm(`Are you sure you want to open ${sentIds.length} letters for editing? This will move them back to draft status.`)) {
            return;
        }

        try {
            setGenerating(true);
            await api.post('/letters/bulk-status', { 
                ids: sentIds, 
                status: 'DRAFT' 
            });
            alert(`Successfully opened ${sentIds.length} letters.`);
            fetchLetters();
        } catch (error: any) {
            console.error('Bulk open failed:', error);
            alert('Bulk open failed.');
        } finally {
            setGenerating(false);
        }
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
            if (activeTab === 'BUDGET') {
                const formData = new FormData();
                formData.append('budgetType', budgetType);
                formData.append('strategy', strategy);
                formData.append('financialYear', financialYear);
                formData.append('emailDate', emailDate);
                formData.append('amountsJson', JSON.stringify(amounts));
                formData.append('customIntro', customIntro);
                formData.append('customOutro', customOutro);
                formData.append('specificDirective', specificDirective);
                if (strategy === 'UPLOAD_BASED' && allotmentFile) {
                    formData.append('file', allotmentFile);
                }

                const response = await api.post('/budget/generate-letters', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (response.data.created === 0) {
                    alert(`No budget letters were generated. Please check if your selected strategy matches the branch data (Sizes/Population) or if your Excel file is correct.`);
                } else {
                    setGenerateResult({
                        message: `Successfully generated ${response.data.created} budget letters.`,
                        created: response.data.created,
                        skipped: response.data.skipped,
                        details: response.data.details || []
                    });
                }
            } else {
                const dateObj = parseLocalISO(selectedDate) || new Date();
                const response = await api.post('/letters/generate', {
                    period: format(dateObj, 'MMM yyyy'),
                    date: selectedDate,
                    type: activeTab,
                    signatoryId: selectedSignatoryId
                });
                setGenerateResult(response.data);
            }
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
                        <span>Manual</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('BUDGET')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center space-x-2 ${activeTab === 'BUDGET'
                            ? 'bg-white text-bank-navy shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Database size={16} />
                        <span>Budget</span>
                    </button>
                </div>
            </div>

            {/* Budget Allotment Center (Visible only on Budget Tab) */}
            {activeTab === 'BUDGET' && (user?.role === 'ADMIN' || user?.section === 'Planning') && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-bank-navy p-6 text-white flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="bg-white/10 p-2 rounded-lg">
                                <Database size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Budget Allotment Center</h3>
                                <p className="text-bank-teal/80 text-sm">Automate official allotment letters across the region</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-xl text-sm font-medium">
                            <Calendar size={16} />
                            <span>FY {financialYear}</span>
                        </div>
                    </div>

                    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* 1. Category & Context */}
                        <div className="space-y-6">
                            <div className="group">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-bank-navy transition-colors">1. Budget Category</label>
                                <input 
                                    type="text" 
                                    value={budgetType}
                                    onChange={(e) => setBudgetType(e.target.value)}
                                    placeholder="e.g. Sundry Other Charges"
                                    className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 font-bold text-bank-navy focus:ring-2 focus:ring-bank-teal/20 focus:bg-white transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="group">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Financial Year</label>
                                    <input 
                                        type="text" 
                                        value={financialYear}
                                        onChange={(e) => setFinancialYear(e.target.value)}
                                        className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 font-bold text-bank-navy"
                                    />
                                </div>
                                <div className="group">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Ref. Date</label>
                                    <input 
                                        type="text" 
                                        value={emailDate}
                                        onChange={(e) => setEmailDate(e.target.value)}
                                        className="w-full bg-gray-50 border-gray-100 rounded-xl px-4 py-3 font-bold text-bank-navy"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Method Selection */}
                        <div className="space-y-6 lg:border-l lg:border-r lg:px-8 border-gray-100">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">2. Allotment Method</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'SIZE_BASED', label: 'Standard (By Branch Size)', icon: Award },
                                        { id: 'POPULATION_BASED', label: 'By Population Group', icon: TrendingUp },
                                        { id: 'UPLOAD_BASED', label: 'Bulk Excel Upload', icon: Upload }
                                    ].map((m) => (
                                        <button
                                            key={m.id}
                                            onClick={() => setStrategy(m.id as any)}
                                            className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all ${
                                                strategy === m.id 
                                                ? 'border-bank-teal bg-bank-teal/5 text-bank-navy ring-4 ring-bank-teal/10' 
                                                : 'border-gray-50 bg-gray-50/50 text-gray-500 hover:border-gray-200'
                                            }`}
                                        >
                                            <m.icon size={20} className={strategy === m.id ? 'text-bank-teal' : 'text-gray-400'} />
                                            <span className="font-bold text-sm">{m.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 3. Amounts Configuration */}
                        <div className="space-y-6">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">3. Configure Amounts</label>
                            
                            {strategy === 'UPLOAD_BASED' ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-500">Upload Excel with "Branch Code" and "Amount" columns.</p>
                                    <input 
                                        type="file" 
                                        id="budget-upload" 
                                        className="hidden" 
                                        onChange={(e) => setAllotmentFile(e.target.files?.[0] || null)}
                                        accept=".xlsx,.xls,.csv"
                                    />
                                    <label 
                                        htmlFor="budget-upload" 
                                        className="flex flex-col items-center justify-center cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 p-8 rounded-2xl text-center hover:border-bank-teal/30 hover:bg-bank-teal/5 transition-all group"
                                    >
                                        <Upload className={`mb-3 transition-transform group-hover:-translate-y-1 ${allotmentFile ? 'text-bank-teal' : 'text-gray-300'}`} size={32} />
                                        <span className="text-sm font-bold text-bank-navy">
                                            {allotmentFile ? allotmentFile.name : 'Select Data File...'}
                                        </span>
                                        <span className="text-xs text-gray-400 mt-1">.xlsx, .xls or .csv</span>
                                    </label>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {(strategy === 'SIZE_BASED' 
                                        ? ['Small', 'Medium', 'Large', 'Very Large', 'Extra Large'] 
                                        : ['RURAL', 'SEMI-URBAN', 'URBAN', 'METRO']
                                    ).map(key => (
                                        <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                                            <span className="text-sm font-bold text-gray-600">{key}</span>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                                                <input 
                                                    type="number" 
                                                    value={amounts[key] || 0}
                                                    onChange={(e) => setAmounts({...amounts, [key]: parseInt(e.target.value) || 0})}
                                                    className="w-32 bg-white border-gray-200 rounded-lg text-right pr-3 pl-7 py-1 text-sm font-bold text-bank-navy"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 4. Text Customization */}
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">4. Customize Letter Components</label>
                                <div className="space-y-4">
                                    <div className="group">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Directives Reference (e.g. Email dated 07.04.2026)</label>
                                        <input 
                                            type="text"
                                            value={specificDirective}
                                            onChange={(e) => setSpecificDirective(e.target.value)}
                                            placeholder="Leave blank for standard RO directions"
                                            className="w-full bg-gray-50 border-gray-100 rounded-lg px-3 py-2 text-sm text-bank-navy focus:bg-white"
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Custom Introduction (Optional)</label>
                                        <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-bank-teal/20 transition-all">
                                            <ReactQuill 
                                                theme="snow"
                                                value={customIntro}
                                                onChange={setCustomIntro}
                                                placeholder="Example: We are pleased to announce the approved budgets for the coming year..."
                                                modules={{
                                                    toolbar: [
                                                        ['bold', 'italic', 'underline'],
                                                        [{ 'list': 'bullet' }, { 'list': 'ordered' }],
                                                        ['clean']
                                                    ],
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Custom Utilization Instructions (Optional)</label>
                                        <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-bank-teal/20 transition-all">
                                            <ReactQuill 
                                                theme="snow"
                                                value={customOutro}
                                                onChange={setCustomOutro}
                                                placeholder="Specific usage guidelines or caveats..."
                                                modules={{
                                                    toolbar: [
                                                        ['bold', 'italic', 'underline'],
                                                        [{ 'list': 'bullet' }, { 'list': 'ordered' }],
                                                        ['clean']
                                                    ],
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <style>{`
                                        .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #f3f4f6 !important; background: white; padding: 4px 8px !important; }
                                        .ql-container.ql-snow { border: none !important; font-family: inherit; font-size: 13px; min-height: 80px; }
                                        .ql-editor { padding: 8px 12px !important; min-height: 80px; }
                                    `}</style>
                                </div>
                            </div>

                            <button 
                                onClick={handleGenerate}
                                disabled={generating || (strategy === 'UPLOAD_BASED' && !allotmentFile)}
                                className="w-full bg-bank-teal text-white px-6 py-4 rounded-xl font-bold shadow-lg shadow-bank-teal/20 hover:bg-bank-teal/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-3 mt-4"
                            >
                                {generating ? (
                                    <RefreshCw size={20} className="animate-spin" />
                                ) : (
                                    <Mail size={20} />
                                )}
                                <span>{generating ? 'Processing Allotments...' : 'Batch Generate Letters'}</span>
                            </button>

                            {/* New Bulk Action Section */}
                            {(letters.some(l => l.status === 'DRAFT') || letters.some(l => l.status === 'SENT')) && (
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Batch Actions</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {letters.some(l => l.status === 'DRAFT') && (
                                            <button
                                                onClick={handleBulkFreeze}
                                                disabled={generating}
                                                className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-bank-navy text-white font-bold hover:bg-opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                            >
                                                <CheckCircle size={18} />
                                                <span>Freeze All Drafts</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={handleBulkZipDownload}
                                            disabled={generating}
                                            className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gray-100 text-bank-navy font-bold hover:bg-gray-200 transition-all shadow-sm active:scale-95 disabled:opacity-50 col-span-2"
                                        >
                                            <Upload size={18} className="rotate-180" />
                                            <span>Download Batch (.ZIP)</span>
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2 text-center">Freeze moves all drafts to 'Sent' status. Open for Editing moves them back to 'Draft'.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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

                    {(activeTab === 'PERFORMANCE' || activeTab === 'OP_RISK') && signatories.length > 0 && (
                        <div className="flex flex-col min-w-[200px]">
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Signing Authority</label>
                            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                <User size={16} className="text-bank-navy" />
                                <select
                                    value={selectedSignatoryId}
                                    onChange={(e) => setSelectedSignatoryId(e.target.value)}
                                    className="bg-transparent border-none text-sm font-bold text-bank-navy focus:ring-0 w-full"
                                >
                                    <option value="">Default Signatory</option>
                                    {signatories.map(s => (
                                        <option key={s.id} value={s.id}>{s.fullNameEn}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setShowComposer(true)}
                        className="btn-outline flex items-center space-x-2 border-bank-navy text-bank-navy px-6 py-2.5 rounded-lg font-bold hover:bg-bank-navy/5 transition-all"
                    >
                        <FileText size={18} />
                        <span>Compose Manual Letter</span>
                    </button>

                    {(user?.role === 'ADMIN' || (user?.role === 'RO_USER' && user?.section === 'Planning')) && activeTab !== 'MANUAL' && activeTab !== 'BUDGET' && (
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="btn-primary flex items-center justify-center space-x-2 bg-bank-navy text-white px-6 py-2.5 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50"
                            >
                                <RefreshCw size={18} className={generating ? 'animate-spin' : ''} />
                                <span>{generating ? 'Generating Documents...' : `Generate ${activeTab === 'PERFORMANCE' ? 'Performance' : 'OpRisk'} Drafts`}</span>
                            </button>

                            {letters.some(l => l.status === 'DRAFT' && (activeTab === 'PERFORMANCE' ? (l.type === 'APPRECIATION' || l.type === 'EXPLANATION') : l.type === activeTab)) && (
                                <button
                                    onClick={handleBulkZipDownload}
                                    disabled={generating}
                                    className="flex items-center justify-center space-x-2 bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-green-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                >
                                    <FileText size={18} />
                                    <span>{generating ? 'Zipping...' : 'Download All (.ZIP)'}</span>
                                </button>
                            )}
                        </div>
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
                            if (activeTab === 'BUDGET') return l.type === 'BUDGET_ALLOTMENT';
                            return l.type === 'OP_RISK';
                        })
                        .length > 0 ? (
                        letters
                            .filter(l => {
                            if (activeTab === 'PERFORMANCE') return l.type === 'APPRECIATION' || l.type === 'EXPLANATION';
                            if (activeTab === 'MANUAL') return l.type === 'MANUAL';
                            if (activeTab === 'BUDGET') return l.type === 'BUDGET_ALLOTMENT';
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
                                                    <h3 className="font-bold text-bank-navy text-lg">{letter.titleEn.replace(/casa/gi, 'CASA')}</h3>
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
                                            <div className="text-xs text-gray-800 font-bold bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                {(() => {
                                                const exactDate = (letter.orgMeta as any)?.performanceData?.latestDate;
                                                    const dateToFormat = exactDate ? (parseLocalISO(exactDate) || new Date(letter.createdAt)) : new Date(letter.createdAt);
                                                    return format(dateToFormat, 'dd.MM.yyyy');
                                                })()}
                                            </div>
                                            <button
                                                onClick={() => setSelectedLetter(letter)}
                                                className="text-bank-navy text-sm font-bold flex items-center hover:underline"
                                            >
                                                <FileText size={16} className="mr-1" /> View
                                            </button>
                                            <button
                                                onClick={() => handleDownloadPdf(letter.id, letter.titleEn)}
                                                className="text-bank-teal text-sm font-bold flex items-center hover:underline ml-4"
                                            >
                                                <div className="flex items-center bg-bank-teal/5 px-2 py-0.5 rounded border border-bank-teal/20">
                                                    <Upload size={14} className="mr-1 rotate-180" /> 
                                                    <span>PDF</span>
                                                </div>
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
                            <p className="text-gray-500 font-bold text-xl">No {
                                activeTab === 'PERFORMANCE' ? 'performance letters' : 
                                activeTab === 'BUDGET' ? 'budget allotment letters' : 
                                activeTab === 'MANUAL' ? 'manual letters' :
                                'risk advisories'
                            } found</p>
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
                                selectedLetter.type === 'BUDGET_ALLOTMENT' ? 'bg-bank-navy' :
                                    'bg-red-700'
                            }`}>
                            <h2 className="text-lg font-bold flex items-center">
                                {selectedLetter.type === 'APPRECIATION' ? <Award className="mr-2" size={20} /> :
                                    selectedLetter.type === 'OP_RISK' ? <TrendingUp className="mr-2" size={20} /> :
                                    selectedLetter.type === 'BUDGET_ALLOTMENT' ? <Database className="mr-2" size={20} /> :
                                        <AlertCircle className="mr-2" size={20} />}
                                {selectedLetter.titleEn}
                            </h2>
                            <div className="flex items-center space-x-3">
                                <button 
                                    onClick={() => handleDownloadPdf(selectedLetter.id, selectedLetter.titleEn)}
                                    className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                                >
                                    <Upload size={18} className="rotate-180" />
                                    <span>Download PDF</span>
                                </button>
                                <button onClick={() => setSelectedLetter(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {(() => {
                            const isRegional = ['RO', 'LPC', 'REGIONAL OFFICE'].includes(selectedLetter.branch?.type?.toUpperCase() || '') || (selectedLetter.branch as any)?.code === '3933';
                            const pdList = (selectedLetter.orgMeta as any)?.performanceDataList || [];
                            const singlePd = (selectedLetter.orgMeta as any)?.performanceData;
                            const dataList = pdList.length > 0 ? pdList : (singlePd ? [singlePd] : []);

                            // 1. Generate Body HTML using the existing logic
                            const bodyChunks: string[] = [];
                            
                            // Trilingual content headers
                            if (selectedLetter.contentHi) {
                                bodyChunks.push(`<p class="font-hindi text-[13px] mb-4">${selectedLetter.contentHi}</p>`);
                            }
                            if (selectedLetter.contentTa) {
                                bodyChunks.push(`<p class="font-tamil text-[11px] mb-4">${selectedLetter.contentTa}</p>`);
                            }

                            const salutation = selectedLetter.salutation || (selectedLetter.orgMeta as any)?.salutation || 'Dear Sir/Madam,';
                            bodyChunks.push(`<p class="font-bold mb-4">${salutation}</p>`);

                            const cleanedContent = selectedLetter.contentEn
                                .replace(/^Dear Sir\/Madam,?\s*/i, '')
                                .replace(/^To,?\s*/i, '')
                                .trim();

                            cleanedContent.split('\n\n').forEach((paragraph: string) => {
                                if (paragraph.trim() === '[PERFORMANCE_TABLE]') {
                                    if (dataList.length > 0) {
                                        dataList.forEach((pd: any) => {
                                            const isPercent = pd.unit === '%' || pd.unit === 'Ratio' || selectedLetter.titleEn.includes('%');
                                            const scale = (pd.unit === 'Cr') ? 1 : (!isRegional && !isPercent ? 100 : 1);
                                            const unitLabel = pd.unit || (isPercent ? '%' : (isRegional ? 'Cr' : 'Lakhs'));
                                            const fyGrowth = (pd.latest || 0) - (pd.march31st || 0);
                                            const isAchieved = (pd.latest >= pd.budget);
                                            const statusColor = isAchieved ? '#15803d' : '#b91c1c';

                                            bodyChunks.push(`
                                                <div class="my-6">
                                                    <div class="font-bold text-[11px] mb-1 opacity-80 uppercase tracking-tight">KPI: ${pd.parameter || 'Performance Metric'}</div>
                                                    <table style="width: 100%; text-align: center; border-collapse: collapse; border: 1px solid #1e293b66; font-size: 11px;">
                                                        <tr style="background: #f1f5f9; font-weight: bold;">
                                                            <th style="border: 1px solid #1e293b66; padding: 4px;">Baseline Actuals</th>
                                                            <th style="border: 1px solid #1e293b66; padding: 4px;">Current Actuals</th>
                                                            <th style="border: 1px solid #1e293b66; padding: 4px;">Gap to Budget</th>
                                                            <th style="border: 1px solid #1e293b66; padding: 4px;">Status</th>
                                                        </tr>
                                                        <tr>
                                                            <td style="border: 1px solid #1e293b66; padding: 4px;">₹ ${(pd.march31st * scale).toLocaleString('en-IN')} ${unitLabel}</td>
                                                            <td style="border: 1px solid #1e293b66; padding: 4px; font-weight: bold;">₹ ${(pd.latest * scale).toLocaleString('en-IN')} ${unitLabel}</td>
                                                            <td style="border: 1px solid #1e293b66; padding: 4px; font-weight: bold; color: ${statusColor};">₹ ${(pd.gap * scale).toLocaleString('en-IN')} ${unitLabel}</td>
                                                            <td style="border: 1px solid #1e293b66; padding: 4px; font-weight: bold; color: ${statusColor}; uppercase">${isAchieved ? 'ACHIEVED' : 'SHORTFALL'}</td>
                                                        </tr>
                                                    </table>
                                                </div>
                                            `);
                                        });
                                    }
                                } else if (paragraph.trim().startsWith('<div')) {
                                    bodyChunks.push(`<div class="mb-6">${paragraph}</div>`);
                                } else {
                                    bodyChunks.push(`<p class="mb-4 text-justify">${paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`);
                                }
                            });

                            const renderedBodyHtml = bodyChunks.join('');

                            const contentJson = selectedLetter.contentJson 
                                ? (typeof selectedLetter.contentJson === 'string' ? JSON.parse(selectedLetter.contentJson) : selectedLetter.contentJson)
                                : {};
                            const signatories = (selectedLetter.reviewers || []).map((rev: any) => ({
                                name: rev.fullNameEn,
                                nameHi: rev.fullNameHi,
                                nameTa: rev.fullNameTa,
                                titleEn: rev.designationEn || 'Chief Manager',
                                titleHi: rev.designationHi,
                                titleTa: rev.designationTa
                            }));

                            return (
                                <DocumentPreview
                                    title={selectedLetter.titleEn}
                                    titleHi={selectedLetter.titleHi || (selectedLetter.orgMeta as any)?.titleHi || contentJson?.titleHi}
                                    titleTa={selectedLetter.titleTa || (selectedLetter.orgMeta as any)?.titleTa || contentJson?.titleTa}
                                    refNo={selectedLetter.referenceNo}
                                    date={format(new Date(selectedLetter.createdAt), 'do MMMM yyyy')}
                                    bodyHtml={renderedBodyHtml}
                                    approver={selectedLetter.signatory ? {
                                        name: selectedLetter.signatory.fullNameEn,
                                        nameHi: selectedLetter.signatory.fullNameHi || undefined,
                                        nameTa: selectedLetter.signatory.fullNameTa || undefined,
                                        titleEn: selectedLetter.signatory.designation?.nameEn || 'Regional Manager',
                                        titleHi: selectedLetter.signatory.designation?.nameHi || undefined,
                                        titleTa: selectedLetter.signatory.designation?.nameTa || undefined
                                    } : {
                                        name: selectedLetter.type === 'OP_RISK' ? 'Annamalai SM' : ((selectedLetter.orgMeta as any)?.signatoryName || metadata?.organization?.signatoryName || metadata?.regionHeadName || 'System Admin'),
                                        nameHi: selectedLetter.type === 'OP_RISK' ? 'अन्नामलाई एस.एम.' : (selectedLetter.orgMeta as any)?.signatoryNameHi,
                                        nameTa: selectedLetter.type === 'OP_RISK' ? 'அண்ணாமலை எஸ்.எம்.' : (selectedLetter.orgMeta as any)?.signatoryNameTa,
                                        titleEn: selectedLetter.type === 'OP_RISK' ? 'RO Chief Manager' : ((selectedLetter.orgMeta as any)?.signingAuthEn || metadata?.organization?.signingAuthEn || REGIONAL_OFFICE_DATA.signingAuthEn || 'Approver'),
                                        titleHi: selectedLetter.type === 'OP_RISK' ? 'मुख्य प्रबंधक (क्षे.का.)' : (selectedLetter.orgMeta as any)?.signingAuthHi,
                                        titleTa: selectedLetter.type === 'OP_RISK' ? 'தலைமை மேலாளர் (ம.அ.)' : (selectedLetter.orgMeta as any)?.signingAuthTa
                                    }}
                                    organization={metadata?.organization || REGIONAL_OFFICE_DATA}
                                    deptSealSrc={(() => {
                                        const type = selectedLetter.type as any;
                                        if (type === 'BUDGET_ALLOTMENT' || type === 'BUDGET_PURGE' || type === 'BUDGET_BULK') {
                                            const planningDept = departments.find(d => d.code === 'PLANNING' || d.nameEn.includes('Planning'));
                                            if (planningDept?.sealPath) return planningDept.sealPath.startsWith('assets') ? `/${planningDept.sealPath}` : planningDept.sealPath;
                                            return '/assets/dept_seal.png';
                                        }
                                        return (selectedLetter.orgMeta as any)?.deptSealSrc || metadata?.organization?.deptSealUrl || '/assets/dept_seal.png';
                                    })()}
                                    initialSealPos={sealPos}
                                    onSaveSealPos={(pos) => handleSaveSealPosition(pos)}
                                    hideApprovedStatus={selectedLetter.type === 'BUDGET_ALLOTMENT' || selectedLetter.type === 'OP_RISK' || !!(selectedLetter.orgMeta as any)?.hideApprovedStatus}
                                    dailyMovement={(selectedLetter.orgMeta as any)?.dailyMovement}
                                    cashData={(selectedLetter.orgMeta as any)?.cashData}
                                />
                            );
                        })()}

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
