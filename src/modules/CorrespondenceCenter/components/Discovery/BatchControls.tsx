import React from 'react';
import { RefreshCw, FileText, CheckCircle, Upload } from 'lucide-react';
import { Letter } from '../../types';

interface BatchControlsProps {
    activeTab: string;
    generating: boolean;
    handleGenerate: () => void;
    setShowComposer: (val: boolean) => void;
    letters: Letter[];
    handleBulkFreeze: () => void;
    handleBulkOpen: () => void;
    handleBulkZipDownload: () => void;
    canGenerate: boolean;
}

export const BatchControls: React.FC<BatchControlsProps> = ({
    activeTab,
    generating,
    handleGenerate,
    setShowComposer,
    letters,
    handleBulkFreeze,
    handleBulkOpen,
    handleBulkZipDownload,
    canGenerate
}) => {
    const hasDrafts = letters.some(l => l.status === 'DRAFT');
    const hasSent = letters.some(l => l.status === 'SENT');

    return (
        <div className="flex items-center space-x-3">
            <button
                onClick={() => setShowComposer(true)}
                className="btn-outline flex items-center space-x-2 border-bank-navy text-bank-navy px-6 py-2.5 rounded-lg font-bold hover:bg-bank-navy/5 transition-all"
            >
                <FileText size={18} />
                <span>Compose Manual Letter</span>
            </button>

            {canGenerate && activeTab !== 'MANUAL' && activeTab !== 'BUDGET' && (
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="btn-primary flex items-center justify-center space-x-2 bg-bank-navy text-white px-6 py-2.5 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw size={18} className={generating ? 'animate-spin' : ''} />
                    <span>{generating ? 'Generating Documents...' : `Generate ${activeTab === 'PERFORMANCE' ? 'Performance' : 'OpRisk'} Drafts`}</span>
                </button>
            )}

            {activeTab !== 'BUDGET' && (hasDrafts || hasSent) && (
                <div className="flex items-center space-x-2 border-l border-gray-100 pl-4 h-10">
                    {hasDrafts && (
                        <button
                            onClick={handleBulkFreeze}
                            disabled={generating}
                            className="bg-emerald-600 text-white p-2.5 rounded-lg hover:bg-emerald-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            title="Freeze all drafts in current cycle"
                        >
                            <CheckCircle size={18} />
                        </button>
                    )}
                    {hasSent && (
                        <button
                            onClick={handleBulkOpen}
                            disabled={generating}
                            className="bg-orange-500 text-white p-2.5 rounded-lg hover:bg-orange-600 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            title="Open all sent letters for editing"
                        >
                            <RefreshCw size={18} />
                        </button>
                    )}
                    <button
                        onClick={handleBulkZipDownload}
                        disabled={generating}
                        className="bg-gray-800 text-white p-2.5 rounded-lg hover:bg-gray-900 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        title="Download ZIP of all letters"
                    >
                        <Upload size={18} className="rotate-180" />
                    </button>
                </div>
            )}
        </div>
    );
};
