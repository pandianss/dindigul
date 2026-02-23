import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const MISUpload: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setMessage(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const csvData = e.target?.result;
            try {
                const response = await api.post('/mis/upload', { csvData, date });

                const data = response.data;
                if (response.status === 200) {
                    setMessage({ type: 'success', text: data.message });
                    setFile(null);
                } else {
                    setMessage({ type: 'error', text: data.error || 'Upload failed' });
                }
            } catch {
                setMessage({ type: 'error', text: 'Network error during upload' });
            } finally {
                setUploading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy">Daily MIS Upload</h2>
                    <p className="text-gray-500">Upload branch-wise daily performance data via CSV</p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    <FileText size={16} />
                    <span>Template: mis_standard_v1.csv</span>
                </div>
            </div>

            <div className="card p-8 border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center space-y-4 relative">
                <div className="bg-white p-4 rounded-full shadow-sm text-bank-navy">
                    <Upload size={32} />
                </div>
                <div className="text-center">
                    <p className="font-bold text-gray-700">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-400">CSV files only (max 10MB)</p>
                </div>
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {file && (
                    <div className="mt-4 p-3 bg-bank-navy bg-opacity-5 rounded-lg border border-bank-navy border-opacity-20 flex items-center space-x-3">
                        <FileText className="text-bank-navy" size={20} />
                        <span className="text-sm font-medium text-bank-navy">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-6 space-y-4">
                    <h3 className="font-bold text-bank-navy border-b pb-2">Upload Parameters</h3>
                    <div>
                        <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Data Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bank-navy outline-none"
                        />
                    </div>
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-md ${!file || uploading ? 'bg-gray-300 cursor-not-allowed' : 'bg-bank-teal hover:bg-opacity-90'
                            }`}
                    >
                        {uploading ? 'Processing...' : 'Process MIS Upload'}
                    </button>
                </div>

                <div className="card p-6 space-y-4">
                    <h3 className="font-bold text-bank-navy border-b pb-2">Instructions</h3>
                    <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
                        <li>Ensure CSV contains <strong>BranchCode</strong>, <strong>ParameterCode</strong>, and <strong>Value</strong>.</li>
                        <li>Optional <strong>Budget</strong> column can be included for performance tracking.</li>
                        <li>Duplicates for the same date will be overwritten.</li>
                        <li>Data will be immediately visible on Branch & RO dashboards.</li>
                    </ul>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center space-x-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}
        </div>
    );
};

export default MISUpload;
