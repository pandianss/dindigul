import React from 'react';

interface Props {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const ProformaBranchCodeForm: React.FC<Props> = ({ formData, setFormData }) => {
    const c = formData.contentJson as any;
    const setField = (key: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev,
            contentJson: { ...prev.contentJson, [key]: value }
        }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-bank-teal/5 rounded-2xl border border-bank-teal/20">
            <div className="md:col-span-2">
                <h4 className="text-bank-navy font-bold text-sm uppercase tracking-wider border-b border-bank-teal/20 pb-2 mb-4">Branch Code Obtention Details</h4>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">1. Date of Opening</label>
                <input type="date" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                    value={c.dateOfOpening || ''} onChange={(e) => setField('dateOfOpening', e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">2. Name of Branch / Office</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                    value={c.branchName || ''} onChange={(e) => setField('branchName', e.target.value)} />
            </div>
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">3. Permission Letter / License Details</label>
                <textarea rows={2} className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                    value={c.permissionDetails || ''} onChange={(e) => setField('permissionDetails', e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">4. Population Category</label>
                <select className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                    value={c.populationCategory || ''} onChange={(e) => setField('populationCategory', e.target.value)}>
                    <option value="METRO">Metro</option>
                    <option value="URBAN">Urban</option>
                    <option value="SEMI_URBAN">Semi Urban</option>
                    <option value="RURAL">Rural</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">5. Population Centre</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                    value={c.populationCentre || ''} onChange={(e) => setField('populationCentre', e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">6. Community Development Block</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                    value={c.communityBlock || ''} onChange={(e) => setField('communityBlock', e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">7. Taluk / Tehsil</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                    value={c.talukTehsil || ''} onChange={(e) => setField('talukTehsil', e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">8. District and State</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                    value={c.districtState || ''} onChange={(e) => setField('districtState', e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">9. Working Hours</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                    value={c.workingHours || ''} onChange={(e) => setField('workingHours', e.target.value)} />
            </div>
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">10. Complete Postal Address with Pin Code</label>
                <textarea rows={2} className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                    value={c.postalAddress || ''} onChange={(e) => setField('postalAddress', e.target.value)} />
            </div>
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">11. Nearest Currency Chest</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                    placeholder="Part I/II code, Bank Name, Distance in KM"
                    value={c.currencyChest || ''} onChange={(e) => setField('currencyChest', e.target.value)} />
            </div>
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">12. Authorised Dealer (FX Routing)</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                    placeholder="Branch Name and Part I/II Code"
                    value={c.authorisedDealer || ''} onChange={(e) => setField('authorisedDealer', e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">13. Whether branch is under CBS</label>
                <select className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                    value={c.underCBS || ''} onChange={(e) => setField('underCBS', e.target.value)}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">14. MICR Code</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                    value={c.micrCode || ''} onChange={(e) => setField('micrCode', e.target.value)} />
            </div>
        </div>
    );
};
