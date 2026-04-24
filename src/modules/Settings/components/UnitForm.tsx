import React from 'react';
import { MasterItem } from '../types';

interface UnitFormProps {
    formData: MasterItem;
    setFormData: (data: MasterItem) => void;
    handleSpecialStatusChange: (status: string) => void;
}

export const UnitForm: React.FC<UnitFormProps> = ({ 
    formData, 
    setFormData, 
    handleSpecialStatusChange 
}) => {
    return (
        <div className="space-y-8">
            {/* 1. Core Identification */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Core Identification</h4>
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">SOL (Unique ID)</label>
                        <input
                            className="w-full p-2.5 border rounded-lg font-black text-bank-navy focus:ring-2 focus:ring-bank-teal/20 outline-none transition-all"
                            value={formData.code || ''}
                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                            required
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">English Name</label>
                        <input
                            className="w-full p-2.5 border rounded-lg font-bold focus:ring-2 focus:ring-bank-teal/20 outline-none transition-all"
                            value={formData.nameEn || ''}
                            onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                            required
                        />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Tamil Name</label>
                        <input
                            className="w-full p-2.5 border rounded-lg font-tamil focus:ring-2 focus:ring-bank-teal/20 outline-none transition-all"
                            value={formData.nameTa || ''}
                            onChange={e => setFormData({ ...formData, nameTa: e.target.value })}
                        />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Hindi Name</label>
                        <input
                            className="w-full p-2.5 border rounded-lg font-hindi focus:ring-2 focus:ring-bank-teal/20 outline-none transition-all"
                            value={formData.nameHi || ''}
                            onChange={e => setFormData({ ...formData, nameHi: e.target.value })}
                        />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Open Date</label>
                        <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            className="w-full p-2.5 border rounded-lg font-bold focus:ring-2 focus:ring-bank-teal/20 outline-none transition-all"
                            value={formData.openDate || ''}
                            onChange={e => setFormData({ ...formData, openDate: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* 2. Categorization & Risk */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Categorization & Risk</h4>
                <div className="grid grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Type</label>
                        <select
                            className="w-full p-2.5 border rounded-lg font-bold focus:ring-2 focus:ring-bank-teal/20 outline-none appearance-none bg-white"
                            value={formData.type || 'BRANCH'}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="BRANCH">Branch</option>
                            <option value="RO">Regional Office</option>
                            <option value="LPC">LPC</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Size</label>
                        <select
                            className="w-full p-2.5 border rounded-lg font-bold focus:ring-2 focus:ring-bank-teal/20 outline-none appearance-none bg-white"
                            value={formData.size || ''}
                            onChange={e => setFormData({ ...formData, size: e.target.value })}
                        >
                            <option value="">Select...</option>
                            <option value="SMALL">Small</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="LARGE">Large</option>
                            <option value="V_LARGE">Very Large</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Pop. Group</label>
                        <select
                            className="w-full p-2.5 border rounded-lg font-bold focus:ring-2 focus:ring-bank-teal/20 outline-none appearance-none bg-white"
                            value={formData.populationGroup || ''}
                            onChange={e => setFormData({ ...formData, populationGroup: e.target.value })}
                        >
                            <option value="RURAL">Rural</option>
                            <option value="SEMI_URBAN">Semi-Urban</option>
                            <option value="URBAN">Urban</option>
                            <option value="METRO">Metro</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Risk Category</label>
                        <select
                            className="w-full p-2.5 border rounded-lg font-bold focus:ring-2 focus:ring-bank-teal/20 outline-none appearance-none bg-white"
                            value={formData.riskCategory || ''}
                            onChange={e => setFormData({ ...formData, riskCategory: e.target.value })}
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Prev Risk</label>
                        <input
                            className="w-full p-2.5 border rounded-lg font-bold focus:ring-2 focus:ring-bank-teal/20 outline-none"
                            value={formData.prevRiskCategory || ''}
                            onChange={e => setFormData({ ...formData, prevRiskCategory: e.target.value })}
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Risk Effective Date</label>
                        <input
                            type="date"
                            className="w-full p-2.5 border rounded-lg font-bold focus:ring-2 focus:ring-bank-teal/20 outline-none"
                            value={formData.riskEffectiveDate?.toString().split('T')[0] || ''}
                            onChange={e => setFormData({ ...formData, riskEffectiveDate: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* 3. Address Matrix */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Regional Address Matrix</h4>
                <div className="grid grid-cols-3 gap-6">
                    {/* English Address */}
                    <div className="space-y-3">
                        <p className="text-[9px] font-black text-bank-navy/40 uppercase tracking-widest border-b pb-1">English Address</p>
                        <input placeholder="Add1 English" className="w-full p-2 border rounded text-xs font-bold" value={formData.address1En || ''} onChange={e => setFormData({ ...formData, address1En: e.target.value })} />
                        <input placeholder="Add 2 English" className="w-full p-2 border rounded text-xs font-bold" value={formData.address2En || ''} onChange={e => setFormData({ ...formData, address2En: e.target.value })} />
                        <input placeholder="District English" className="w-full p-2 border rounded text-xs font-bold" value={formData.districtEn || ''} onChange={e => setFormData({ ...formData, districtEn: e.target.value })} />
                    </div>
                    {/* Tamil Address */}
                    <div className="space-y-3">
                        <p className="text-[9px] font-black text-bank-navy/40 uppercase tracking-widest border-b pb-1">Tamil Address (தமிழ்)</p>
                        <input placeholder="Add1 Tamil" className="w-full p-2 border rounded text-xs font-tamil" value={formData.address1Ta || ''} onChange={e => setFormData({ ...formData, address1Ta: e.target.value })} />
                        <input placeholder="Add 2 Tamil" className="w-full p-2 border rounded text-xs font-tamil" value={formData.address2Ta || ''} onChange={e => setFormData({ ...formData, address2Ta: e.target.value })} />
                        <input placeholder="District Tamil" className="w-full p-2 border rounded text-xs font-tamil" value={formData.districtTa || ''} onChange={e => setFormData({ ...formData, districtTa: e.target.value })} />
                    </div>
                    {/* Hindi Address */}
                    <div className="space-y-3">
                        <p className="text-[9px] font-black text-bank-navy/40 uppercase tracking-widest border-b pb-1">Hindi Address (हिंदी)</p>
                        <input placeholder="Add1 Hindi" className="w-full p-2 border rounded text-xs font-hindi" value={formData.address1Hi || ''} onChange={e => setFormData({ ...formData, address1Hi: e.target.value })} />
                        <input placeholder="Add 2 Hindi" className="w-full p-2 border rounded text-xs font-hindi" value={formData.address2Hi || ''} onChange={e => setFormData({ ...formData, address2Hi: e.target.value })} />
                        <input placeholder="District Hindi" className="w-full p-2 border rounded text-xs font-hindi" value={formData.districtHi || ''} onChange={e => setFormData({ ...formData, districtHi: e.target.value })} />
                    </div>
                </div>
            </div>

            {/* 4. Technical Identifiers & Contact */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Technical Identifiers & Contact</h4>
                <div className="grid grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">IFSC</label>
                        <input className="w-full p-2 border rounded text-xs font-black uppercase" value={formData.ifsc || ''} onChange={e => setFormData({ ...formData, ifsc: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">MICR</label>
                        <input className="w-full p-2 border rounded text-xs font-black" value={formData.micr || ''} onChange={e => setFormData({ ...formData, micr: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">BSR Code</label>
                        <input className="w-full p-2 border rounded text-xs font-black" value={formData.bsrCode || ''} onChange={e => setFormData({ ...formData, bsrCode: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Pincode</label>
                        <input className="w-full p-2 border rounded text-xs font-black" value={formData.pincode || ''} onChange={e => setFormData({ ...formData, pincode: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Phone</label>
                        <input className="w-full p-2 border rounded text-xs font-bold" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Email</label>
                        <input className="w-full p-2 border rounded text-xs font-bold" type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Latitude</label>
                        <input type="number" step="0.0001" className="w-full p-2 border rounded text-xs font-bold" value={formData.latitude || ''} onChange={e => setFormData({ ...formData, latitude: parseFloat(e.target.value) })} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Longitude</label>
                        <input type="number" step="0.0001" className="w-full p-2 border rounded text-xs font-bold" value={formData.longitude || ''} onChange={e => setFormData({ ...formData, longitude: parseFloat(e.target.value) })} />
                    </div>
                </div>
            </div>
        </div>
    );
};
