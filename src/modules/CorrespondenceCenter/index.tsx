import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, FileText, Database, RefreshCw, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { parseLocalISO } from '../../utils/dateUtils';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LetterComposer from '../LetterComposer';
import { Letter, CorrespondenceMetadata, Signatory } from './types';
import { isLetterInActiveCategory, isLetterInSelectedCycle } from './utils';

// Orchestrators
import { BudgetCenter } from './components/Budget/BudgetCenter';
import { LetterFilters } from './components/Discovery/LetterFilters';
import { BatchControls } from './components/Discovery/BatchControls';
import { LetterTable } from './components/Discovery/LetterTable';
import { LetterPreview } from './components/Viewer/LetterPreview';
import { DownloadProgress } from './components/Discovery/DownloadProgress';
import JSZip from 'jszip';

const CorrespondenceCenter: React.FC = () => {
    const { user } = useAuth();
    const [letters, setLetters] = useState<Letter[]>([]);
    const [metadata, setMetadata] = useState<CorrespondenceMetadata>({
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
    
    // Download Progress
    const [downloadStatus, setDownloadStatus] = useState<'IDLE' | 'GENERATING' | 'ZIPPING' | 'COMPLETED' | 'ERROR'>('IDLE');
    const [currentDownload, setCurrentDownload] = useState(0);
    const [totalDownload, setTotalDownload] = useState(0);
    
    // Preview/Seal State
    const [isMovingSeal, setIsMovingSeal] = useState(false);
    const [sealPos, setSealPos] = useState({ x: 0, y: 30 });

    // Budget State
    const [budgetType, setBudgetType] = useState('Sundry Other Charges');
    const [strategy, setStrategy] = useState<'SIZE_BASED' | 'POPULATION_BASED' | 'UPLOAD_BASED'>('SIZE_BASED');
    const [financialYear, setFinancialYear] = useState('2026-27');
    const [emailDate, setEmailDate] = useState('07.04.2026');
    const [allotmentFile, setAllotmentFile] = useState<File | null>(null);
    const [amounts, setAmounts] = useState<Record<string, number>>({
        'Small': 90000, 'Medium': 150000, 'Large': 200000, 'Very Large': 150000, 'Extra Large': 300000,
        'RURAL': 50000, 'SEMI-URBAN': 75000, 'URBAN': 100000, 'METRO': 150000
    });
    const [customIntro, setCustomIntro] = useState('');
    const [customOutro, setCustomOutro] = useState('');
    const [specificDirective, setSpecificDirective] = useState('');

    const [signatories, setSignatories] = useState<Signatory[]>([]);
    const [selectedSignatoryId, setSelectedSignatoryId] = useState<string>('');

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
        api.get('/signatories').then(res => {
            setSignatories(res.data);
            const annamalai = res.data.find((u: any) => u.fullNameEn?.includes('Annamalai'));
            if (annamalai) setSelectedSignatoryId(annamalai.id);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        if (selectedLetter) {
            const meta = (selectedLetter.orgMeta as any) || {};
            setSealPos({ x: meta.sealX ?? 0, y: meta.sealY ?? 30 });
            setIsMovingSeal(false);
        }
    }, [selectedLetter]);

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await api.patch(`/letters/${id}/status`, { status });
            fetchLetters();
            if (selectedLetter?.id === id) {
                setSelectedLetter({ ...selectedLetter, status } as any);
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleSaveSealPosition = async () => {
        if (!selectedLetter) return;
        if (selectedLetter.status === 'SENT') {
            alert('Cannot edit a frozen letter.');
            setIsMovingSeal(false);
            return;
        }
        try {
            const updatedMeta = {
                ...(selectedLetter.orgMeta as any),
                sealX: sealPos.x,
                sealY: sealPos.y
            };
            await api.patch(`/letters/${selectedLetter.id}`, { orgMeta: updatedMeta });
            setSelectedLetter({ ...selectedLetter, orgMeta: updatedMeta });
            setIsMovingSeal(false);
            alert('Seal position saved successfully.');
        } catch (error) {
            console.error('Failed to save seal position:', error);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
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
                const res = await api.post('/budget/generate-letters', formData);
                alert(`Generated ${res.data.created} letters.`);
            } else {
                const dateObj = parseLocalISO(selectedDate) || new Date();
                await api.post('/letters/generate', {
                    period: format(dateObj, 'MMM yyyy'),
                    date: selectedDate,
                    type: activeTab,
                    signatoryId: selectedSignatoryId
                });
            }
            fetchLetters();
        } catch (error: any) {
            alert(`Generation failed: ${error?.response?.data?.error || error.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleBulkFreeze = async () => {
        const draftIds = filteredLetters.filter(l => l.status === 'DRAFT').map(l => l.id);
        if (draftIds.length === 0) return;
        if (!window.confirm(`Freeze ${draftIds.length} letters?`)) return;
        try {
            setGenerating(true);
            await api.post('/letters/bulk-status', { ids: draftIds, status: 'SENT' });
            fetchLetters();
        } finally {
            setGenerating(false);
        }
    };

    const handleBulkOpen = async () => {
        const sentIds = filteredLetters.filter(l => l.status === 'SENT').map(l => l.id);
        if (sentIds.length === 0) return;
        if (!window.confirm(`Open ${sentIds.length} letters?`)) return;
        try {
            setGenerating(true);
            await api.post('/letters/bulk-status', { ids: sentIds, status: 'DRAFT' });
            fetchLetters();
        } finally {
            setGenerating(false);
        }
    };

    const handleBulkZipDownload = async () => {
        const downloadIds = filteredLetters.filter(l => l.status === 'DRAFT' || l.status === 'SENT').map(l => l.id);
        if (downloadIds.length === 0) {
            alert('No downloadable letters found in the current view.');
            return;
        }

        const count = downloadIds.length;
        setTotalDownload(count);
        setCurrentDownload(0);
        setDownloadStatus('GENERATING');

        const zip = new JSZip();

        try {
            for (let i = 0; i < count; i++) {
                const id = downloadIds[i];
                setCurrentDownload(i + 1);
                
                const letter = filteredLetters.find(l => l.id === id);
                let fileName = '';
                
                if (letter?.type === 'OP_RISK' && letter.period && /^\d{2}\.\d{2}\.\d{4}$/.test(letter.period)) {
                    const [d, m, y] = letter.period.split('.');
                    const yyyymmdd = `${y}${m}${d}`;
                    const sol = letter.branch?.code || '0000';
                    fileName = `${sol}_OA_${yyyymmdd}.pdf`;
                } else {
                    const title = letter ? (letter.titleEn || `Letter_${id}`).replace(/\s+/g, '_') : `Letter_${id}`;
                    fileName = `${title}_${id.slice(-4)}.pdf`;
                }

                const res = await api.get(`/letters/${id}/pdf`, { responseType: 'blob' });
                zip.file(fileName, res.data);
            }

            setDownloadStatus('ZIPPING');
            const content = await zip.generateAsync({ type: 'blob' });
            
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Batch_Letters_${format(new Date(), 'ddMMyyyy_HHmm')}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setDownloadStatus('COMPLETED');
        } catch (error) {
            console.error('Batch download failed:', error);
            setDownloadStatus('ERROR');
        }
    };

    const handleDownloadPdf = async (id: string, title: string) => {
        try {
            const res = await api.get(`/letters/${id}/pdf`, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/\s+/g, '_')}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const handleUploadScan = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingId(id);
        const formData = new FormData();
        formData.append('document', file);
        try {
            await api.post(`/letters/${id}/upload-scan`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            fetchLetters();
        } finally {
            setUploadingId(null);
        }
    };

    const filteredLetters = letters.filter(l => 
        isLetterInActiveCategory(l, activeTab) && 
        isLetterInSelectedCycle(l, activeTab, selectedDate)
    );

    const canGenerate = (user?.role === 'ADMIN' || (user?.role === 'RO_USER' && user?.section === 'Planning'));

    if (showComposer) {
        return <LetterComposer onBack={() => { setShowComposer(false); fetchLetters(); }} />;
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy">Correspondence Center</h2>
                    <p className="text-gray-500">Manage formal letters and advisories</p>
                </div>
                <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                    {[
                        { id: 'PERFORMANCE', label: 'Performance', icon: Award },
                        { id: 'OP_RISK', label: 'Op Risk', icon: TrendingUp },
                        { id: 'MANUAL', label: 'Manual', icon: FileText },
                        { id: 'BUDGET', label: 'Budget', icon: Database }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center space-x-2 ${activeTab === tab.id
                                ? 'bg-white text-bank-navy shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <tab.icon size={16} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'BUDGET' && (canGenerate || user?.section === 'Planning') && (
                <BudgetCenter 
                    {...{ budgetType, setBudgetType, financialYear, setFinancialYear, emailDate, setEmailDate, strategy, setStrategy, amounts, setAmounts, allotmentFile, setAllotmentFile, specificDirective, setSpecificDirective, customIntro, setCustomIntro, customOutro, setCustomOutro, generating, handleGenerate, handleBulkFreeze, handleBulkZipDownload, letters }}
                />
            )}

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <LetterFilters 
                    activeTab={activeTab}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    signatories={signatories}
                    selectedSignatoryId={selectedSignatoryId}
                    setSelectedSignatoryId={setSelectedSignatoryId}
                />
                <BatchControls 
                    activeTab={activeTab}
                    generating={generating}
                    handleGenerate={handleGenerate}
                    setShowComposer={setShowComposer}
                    letters={filteredLetters}
                    handleBulkFreeze={handleBulkFreeze}
                    handleBulkOpen={handleBulkOpen}
                    handleBulkZipDownload={handleBulkZipDownload}
                    canGenerate={canGenerate}
                />
            </div>

            <LetterTable 
                letters={filteredLetters}
                loading={loading}
                onSelect={setSelectedLetter}
                onDownload={handleDownloadPdf}
                onUpload={handleUploadScan}
                uploadingId={uploadingId}
            />

            {selectedLetter && (
                <LetterPreview 
                    letter={selectedLetter}
                    onBack={() => setSelectedLetter(null)}
                    onDownload={handleDownloadPdf}
                    onUpdateStatus={handleUpdateStatus}
                    onUploadScan={handleUploadScan}
                    uploadingId={uploadingId}
                    isMovingSeal={isMovingSeal}
                    setIsMovingSeal={setIsMovingSeal}
                    sealPos={sealPos}
                    setSealPos={setSealPos}
                    handleSaveSealPosition={handleSaveSealPosition}
                    metadata={metadata}
                />
            )}

            <DownloadProgress 
                current={currentDownload}
                total={totalDownload}
                status={downloadStatus}
                onClose={() => setDownloadStatus('IDLE')}
            />
        </div>
    );
};

export default CorrespondenceCenter;
