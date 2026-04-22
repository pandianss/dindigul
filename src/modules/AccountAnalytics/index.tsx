import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import api from '../../services/api';
import { formatLocalISO, parseLocalISO } from '../../utils/dateUtils';
import { PresentationStudio } from '../presentation/PresentationStudio';

// Local modular components
import { AnalyticsData, BranchStats } from './types';
import { AnalyticsHeader } from './components/AnalyticsHeader';
import { ConfigPanel } from './components/ConfigPanel';
import { IngestionStrip } from './components/IngestionStrip';
import { OverviewTab } from './components/OverviewTab';
import { IntelligenceTab } from './components/IntelligenceTab';
import { ExceptionsTab } from './components/ExceptionsTab';
import { SpecialReportTab } from './components/SpecialReportTab';

const AccountAnalytics: React.FC = () => {
    // Phase 1: State Management
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<AnalyticsData | null>(null);
    const [intelligence, setIntelligence] = useState<any | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
    const [lastUploadResult, setLastUploadResult] = useState<any | null>(null);
    const [date, setDate] = useState(formatLocalISO(new Date()));
    const [sbThreshold, setSbThreshold] = useState<number>(0);
    const [cdThreshold, setCdThreshold] = useState<number>(0);
    const [updatingThreshold, setUpdatingThreshold] = useState(false);
    const [uploadType, setUploadType] = useState<'opening' | 'closure'>('opening');
    const [eligibleSchemes, setEligibleSchemes] = useState<string>('');
    const [showSettings, setShowSettings] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'intelligence' | 'exceptions' | 'presentation_studio' | 'special_report'>('overview');
    const [branchPeriod, setBranchPeriod] = useState<'month' | 'fy'>('month');
    const [specialReport, setSpecialReport] = useState<any | null>(null);
    const [reportPeriod, setReportPeriod] = useState<'month' | 'fy'>('month');
    const [reportLoading, setReportLoading] = useState(false);
    const [reprocessing, setReprocessing] = useState(false);
    const [downloadingMetric, setDownloadingMetric] = useState<string | null>(null);
    const reportRef = useRef<HTMLDivElement>(null);
 
    // Phase 2: Core Data Fetching
    const fetchStats = async () => {
        setErrorMessage(null);
        try {
            const response = await api.get('/account-analytics/analytics');
            if (response.data?.error) {
                setErrorMessage(response.data.error);
                return;
            }
            setStats(response.data);
            setSbThreshold(response.data.sbThreshold || 500);
            setCdThreshold(response.data.cdThreshold || 1000);
            setEligibleSchemes(response.data.eligibleSchemes?.join(', ') || '');
        } catch (error: any) {
            console.error('Failed to fetch analytics:', error);
            setErrorMessage(error.response?.data?.error || 'Connection failure or internal server error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchIntelligence = async () => {
        try {
            const response = await api.get('/account-analytics/intelligence-reports');
            setIntelligence(response.data);
        } catch (error) {
            console.error('Failed to fetch intelligence:', error);
        }
    };

    const fetchSpecialReport = async (period: 'month' | 'fy' = reportPeriod) => {
        setReportLoading(true);
        try {
            const res = await api.get(`/account-analytics/special-report?period=${period}`);
            setSpecialReport(res.data);
        } catch (e) {
            console.error('Failed to fetch special report:', e);
        } finally {
            setReportLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchIntelligence();
    }, []);

    // Phase 3: Action Handlers
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setMessage(null);
        setLastUploadResult(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const csvData = e.target?.result;
            try {
                const endpoint = uploadType === 'opening' ? '/account-analytics/upload' : '/account-analytics/upload-closures';
                const response = await api.post(endpoint, { csvData, date });
                const { message: msg, results, summary } = response.data;
                const corruptedMsg = results?.corrupted > 0 ? ` (${results.corrupted} corrupted records skipped)` : '';
                setMessage({ type: 'success', text: `${msg}${corruptedMsg}` });
                setLastUploadResult(summary);
                setFile(null);
                fetchStats();
            } catch (error: any) {
                setMessage({ type: 'error', text: error.response?.data?.error || 'Upload failed' });
            } finally {
                setUploading(false);
            }
        };
        reader.readAsText(file);
    };

    const handleUpdateThreshold = async () => {
        setUpdatingThreshold(true);
        try {
            await api.post('/account-analytics/config', { key: 'MIN_SB_BALANCE_THRESHOLD', value: sbThreshold });
            await api.post('/account-analytics/config', { key: 'MIN_CD_BALANCE_THRESHOLD', value: cdThreshold });
            const schemesArray = eligibleSchemes.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
            await api.post('/account-analytics/config', { key: 'PRODUCT_ADOPTION_SCHEMES', value: schemesArray });

            setMessage({ type: 'success', text: 'Performance thresholds updated successfully' });
            await fetchStats();
            setShowSettings(false);
        } catch (error: any) {
            console.error('Failed to update thresholds:', error);
            setMessage({ type: 'error', text: `Failed: ${error.response?.data?.error || error.message}` });
        } finally {
            setUpdatingThreshold(false);
        }
    };

    const downloadReportAsImage = async (metricKey?: string) => {
        if (!specialReport) return;
        const target = metricKey || 'all';
        setMessage({ type: 'info', text: 'Step 1/4: Preparing performance data...' });
        setDownloadingMetric(target);
        
        try {
            const url = `/account-analytics/special-report/download?period=${reportPeriod}${metricKey ? `&metric=${metricKey}` : ''}`;
            setMessage({ type: 'info', text: 'Step 2/4: Rendering high-resolution layout...' });
            const response = await api.get(url, { responseType: 'blob', timeout: 60000 });
            
            setMessage({ type: 'info', text: 'Step 3/4: Processing image transmission...' });
            const blob = new Blob([response.data], { type: 'image/png' });
            
            if (blob.size < 100) {
                const text = await blob.text();
                throw new Error(`Server returned error: ${text.substring(0, 100)}`);
            }

            setMessage({ type: 'info', text: 'Step 4/4: Finalizing download...' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            
            const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
            const filename = `Special_Report_${reportPeriod}${metricKey ? `_${metricKey}` : ''}_${timestamp}.png`;
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);
            }, 100);

            setMessage({ type: 'success', text: `Report downloaded: ${filename}` });
        } catch (e: any) {
            console.error('Download failed:', e);
            let errorMessage = e.message;
            if (e.response?.data instanceof Blob) {
                try {
                    const text = await e.response.data.text();
                    const errorJson = JSON.parse(text);
                    errorMessage = errorJson.error || errorMessage;
                } catch (parseError) {
                    const rawText = await e.response.data.text();
                    if (rawText.length < 200) errorMessage = rawText;
                }
            } else if (e.response?.data?.error) {
                errorMessage = e.response.data.error;
            }
            setMessage({ type: 'error', text: `Download failed: ${errorMessage}` });
        } finally {
            setDownloadingMetric(null);
        }
    };

    const handleReprocessAll = async () => {
        setReprocessing(true);
        try {
            await api.post('/account-analytics/reprocess-all');
            setMessage({ type: 'success', text: 'Re-processing started. Please refresh in ~30 seconds.' });
        } catch (e: any) {
            setMessage({ type: 'error', text: e.response?.data?.error || 'Reprocess failed' });
        } finally {
            setReprocessing(false);
        }
    };

    // Phase 4: Derived State
    const filteredBranches = (branchPeriod === 'month' ? stats?.branchBreakdown : stats?.branchBreakdownFY)?.filter(b =>
        b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.code.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-bank-teal/20 border-t-bank-teal rounded-full animate-spin mb-4" />
                <p className="text-gray-400 font-bold tracking-widest text-[10px] uppercase">Calculating Metrics...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center py-20 card bg-gray-50 border-dashed">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest">CASA Hub Data Unavailable</h3>
                <p className="text-red-400 text-xs mt-2 font-medium max-w-md text-center">{errorMessage || 'The analytics engine encountered an unexpected error.'}</p>
                <button 
                    onClick={fetchStats}
                    className="mt-8 px-8 py-2.5 bg-bank-navy text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <AnalyticsHeader 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                showSettings={showSettings}
                setShowSettings={setShowSettings}
                fetchSpecialReport={fetchSpecialReport}
                reportPeriod={reportPeriod}
            />

            {showSettings && (
                <ConfigPanel 
                    sbThreshold={sbThreshold}
                    setSbThreshold={setSbThreshold}
                    cdThreshold={cdThreshold}
                    setCdThreshold={setCdThreshold}
                    eligibleSchemes={eligibleSchemes}
                    setEligibleSchemes={setEligibleSchemes}
                    handleUpdateThreshold={handleUpdateThreshold}
                    updatingThreshold={updatingThreshold}
                    setShowSettings={setShowSettings}
                />
            )}

            {activeTab === 'overview' && (
                <>
                    <IngestionStrip 
                        stats={stats}
                        uploadType={uploadType}
                        setUploadType={setUploadType}
                        date={date}
                        setDate={setDate}
                        file={file}
                        setFile={setFile}
                        handleFileChange={handleFileChange}
                        handleUpload={handleUpload}
                        uploading={uploading}
                        message={message as any}
                        lastResult={lastUploadResult}
                    />
                    <OverviewTab 
                        stats={stats}
                        branchPeriod={branchPeriod}
                        setBranchPeriod={setBranchPeriod}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        filteredBranches={filteredBranches}
                    />
                </>
            )}

            {activeTab === 'intelligence' && <IntelligenceTab intelligence={intelligence} />}
            {activeTab === 'exceptions' && <ExceptionsTab intelligence={intelligence} />}
            {activeTab === 'presentation_studio' && (
                <div className="h-[800px] border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <PresentationStudio />
                </div>
            )}
            {activeTab === 'special_report' && (
                <SpecialReportTab 
                    specialReport={specialReport}
                    reportPeriod={reportPeriod}
                    setReportPeriod={setReportPeriod}
                    fetchSpecialReport={fetchSpecialReport}
                    reportLoading={reportLoading}
                    downloadReportAsImage={downloadReportAsImage}
                    downloadingMetric={downloadingMetric}
                    handleReprocessAll={handleReprocessAll}
                    reprocessing={reprocessing}
                    reportRef={reportRef}
                />
            )}
        </div>
    );
};

export default AccountAnalytics;
