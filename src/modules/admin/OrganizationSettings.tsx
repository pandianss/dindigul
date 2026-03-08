import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Save, Building2, Phone, Mail, MapPin, PenTool, Loader2, Award } from 'lucide-react';

interface OrganizationConfig {
    bankNameEn: string;
    bankNameTa: string;
    bankNameHi: string;
    phone: string;
    email: string;
    signingAuthEn: string;
    signingAuthTa: string;
    signingAuthHi: string;
    signatoryName: string;
}

const OrganizationSettings: React.FC = () => {
    const [config, setConfig] = useState<OrganizationConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await api.get('/organization');
            setConfig(response.data);
        } catch (error) {
            console.error('Error fetching organization config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config) return;

        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await api.post('/organization', config);
            setMessage({ type: 'success', text: 'Organization settings updated successfully!' });
        } catch (error) {
            console.error('Error updating organization config:', error);
            setMessage({ type: 'error', text: 'Failed to update organization settings.' });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setConfig(prev => prev ? { ...prev, [name]: value } : null);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-bank-navy mb-4" size={40} />
                <p className="text-gray-500 font-medium tracking-wide">Loading organizational configurations...</p>
            </div>
        );
    }

    if (!config) return null;

    return (
        <div className="max-w-4xl mx-auto py-6">
            <div className="flex items-center space-x-3 mb-8">
                <div className="p-3 bg-bank-navy/10 rounded-xl text-bank-navy">
                    <Building2 size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy">Organization Settings</h2>
                    <p className="text-gray-500 text-sm">Derive headers, salutations, and signing authority details across the system.</p>
                </div>
            </div>

            {message.text && (
                <div className={`p-4 rounded-lg mb-6 flex items-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    <span className="font-bold">{message.text}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                {/* Bank Name Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-bank-navy flex items-center border-b pb-2">
                        <Building2 className="mr-2" size={18} /> Bank Name
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">English</label>
                            <input
                                type="text"
                                name="bankNameEn"
                                value={config.bankNameEn}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-navy/20 outline-none font-medium"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tamil</label>
                            <input
                                type="text"
                                name="bankNameTa"
                                value={config.bankNameTa || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-navy/20 outline-none font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Hindi</label>
                            <input
                                type="text"
                                name="bankNameHi"
                                value={config.bankNameHi || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-navy/20 outline-none font-medium"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mb-6">
                    <p className="text-blue-700 text-sm font-medium flex items-center">
                        <Building2 size={16} className="mr-2" />
                        Regional Office details (Name, Address, Phone, Email) are automatically derived from the <b>Units</b> master data for the Regional Office branch.
                    </p>
                </div>

                {/* Signing Authority Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-bank-navy flex items-center border-b pb-2">
                        <Award className="mr-2" size={18} /> Signing Authority Designation
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">English</label>
                            <input
                                type="text"
                                name="signingAuthEn"
                                value={config.signingAuthEn}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-navy/20 outline-none font-medium"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tamil</label>
                            <input
                                type="text"
                                name="signingAuthTa"
                                value={config.signingAuthTa || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-navy/20 outline-none font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Hindi</label>
                            <input
                                type="text"
                                name="signingAuthHi"
                                value={config.signingAuthHi || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-navy/20 outline-none font-medium"
                            />
                        </div>
                    </div>
                </div>

                {/* Signatory Name Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-bank-navy flex items-center border-b pb-2">
                        <PenTool className="mr-2" size={18} /> Authorized Signatory Name
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Full Name (Override)</label>
                            <input
                                type="text"
                                name="signatoryName"
                                value={config.signatoryName || ''}
                                onChange={handleChange}
                                placeholder="e.g. CHANDRA KUMAR P (Leave blank to use system default Region Head)"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-navy/20 outline-none font-medium"
                            />
                            <p className="mt-1 text-xs text-gray-400 italic">This name will appear below the signature line in all formal correspondence.</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary flex items-center space-x-2 bg-bank-navy text-white px-8 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-md active:scale-95 disabled:bg-gray-400"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default OrganizationSettings;
