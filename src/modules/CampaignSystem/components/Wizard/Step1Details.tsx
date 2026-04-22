import React from 'react';
import { Target, Calendar } from 'lucide-react';

interface Step1DetailsProps {
    formData: any;
    setFormData: (data: any) => void;
}

export const Step1Details: React.FC<Step1DetailsProps> = ({ formData, setFormData }) => {
    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-10">
                <div className="space-y-6">
                    <div className="flex items-center space-x-6">
                        <div className="w-24 h-24 bg-white border-2 border-gray-100 rounded-[2rem] flex items-center justify-center overflow-hidden shadow-sm shrink-0 border-dashed hover:border-bank-navy transition-all group">
                            {formData.logoUrl ? (
                                <img src={formData.logoUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <Target size={32} className="text-gray-200 group-hover:text-bank-navy transition-colors scale-x-[-1]" />
                            )}
                        </div>
                        <div className="flex-grow">
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest leading-none">Initiative Identity (Logo URL)</label>
                            <input
                                type="text"
                                placeholder="Link to campaign logo..."
                                value={formData.logoUrl}
                                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                                className="w-full bg-transparent border-b-2 border-gray-100 py-3 text-xs font-bold text-bank-navy focus:border-bank-navy outline-none transition-all placeholder:text-gray-200"
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-50">
                        <div className="group">
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Campaign Title</label>
                            <input
                                type="text"
                                placeholder="e.g., CASA Surge Q1"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 px-6 text-lg font-black text-bank-navy focus:border-bank-navy outline-none transition-all placeholder:text-gray-200"
                            />
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Strategic Tagline</label>
                            <input
                                type="text"
                                placeholder="Drive excellence through growth..."
                                value={formData.tagline}
                                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3 px-6 text-sm font-bold text-gray-700 focus:border-bank-navy outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Global Metric</label>
                            <select
                                value={formData.metric}
                                onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
                                className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3 px-6 text-sm font-black text-bank-navy outline-none"
                            >
                                <option value="Accounts">Accounts (Count)</option>
                                <option value="Amount (Cr)">Amount (Cr)</option>
                                <option value="NPA Progress">NPA Progress</option>
                                <option value="CASA %">CASA %</option>
                            </select>
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Campaign Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3 px-6 text-sm font-black text-bank-navy outline-none"
                            >
                                <option value="INCREASE_COUNT">Bulk New Accounts</option>
                                <option value="INCREASE_AMOUNT">Volume Increase</option>
                                <option value="DECREASE_OUTSTANDING">Reduction Drive</option>
                            </select>
                        </div>
                    </div>
                    <div className="group">
                        <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Total Regional Target</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={formData.targetValue}
                                onChange={(e) => setFormData({ ...formData, targetValue: Number(e.target.value) })}
                                className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 px-6 text-2xl font-black text-bank-teal outline-none"
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300 uppercase tracking-widest">{formData.metric}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase block tracking-widest">Timeline Alignment</label>
                    <div className="flex items-center space-x-4">
                        <div className="flex-1 bg-white p-4 rounded-2xl border-2 border-gray-100 flex items-center space-x-3">
                            <Calendar size={18} className="text-gray-300" />
                            <input 
                                type="date" 
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="bg-transparent text-sm font-black text-bank-navy outline-none"
                            />
                        </div>
                        <div className="flex-1 bg-white p-4 rounded-2xl border-2 border-gray-100 flex items-center space-x-3">
                            <Calendar size={18} className="text-gray-300" />
                            <input 
                                type="date" 
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="bg-transparent text-sm font-black text-bank-navy outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
