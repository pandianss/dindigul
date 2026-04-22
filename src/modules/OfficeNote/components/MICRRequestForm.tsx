import React from 'react';
import ReactQuill from 'react-quill-new';
import { CustomDatePicker } from '../../../components/CustomDatePicker';
import { SectionCard } from './SectionCard';
import { formatLocalISO, parseLocalISO } from '../../../utils/dateUtils';
import { quillModules } from '../constants';

interface Props {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const MICRRequestForm: React.FC<Props> = ({ formData, setFormData }) => {
    const c = formData.contentJson as any;
    const setField = (key: string, value: any) =>
        setFormData(prev => ({
            ...prev,
            contentJson: { ...prev.contentJson, [key]: value }
        }));
    const inputCls = "w-full px-5 py-3 border-2 border-white rounded-xl outline-none focus:border-bank-teal transition-all shadow-sm bg-white";
    const labelCls = "block text-xs font-bold text-gray-500 uppercase mb-2 ml-1 tracking-wider";

    return (
        <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
            <SectionCard title="1. Basic Branch Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelCls}>1. Date of Opening</label>
                        <CustomDatePicker
                            selected={parseLocalISO(c.dateOfOpening)}
                            onChange={(d: Date | null) => setField('dateOfOpening', formatLocalISO(d))}
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>2. Name of the Branch / Office</label>
                        <input className={inputCls} type="text"
                            value={c.branchName || ''}
                            placeholder="e.g. Karuppayurani, Madurai"
                            onChange={e => setField('branchName', e.target.value)} />
                    </div>
                </div>
                <div className="mt-6">
                    <label className={labelCls}>3. Permission Letter / License Details (Attached)</label>
                    <input className={inputCls} type="text"
                        placeholder="e.g. PLG/103/T1-6/87/2024-25 dated 04.09.2024"
                        value={c.permissionDetails || ''}
                        onChange={e => setField('permissionDetails', e.target.value)} />
                </div>
            </SectionCard>

            <SectionCard title="2. Location & Infrastructure">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelCls}>4. Population Category</label>
                        <select className={inputCls} value={c.populationCategory || 'RURAL'}
                            onChange={e => setField('populationCategory', e.target.value)}>
                            <option value="METRO">Metro</option>
                            <option value="URBAN">Urban</option>
                            <option value="SEMI-URBAN">Semi Urban</option>
                            <option value="RURAL">Rural</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>5. Taluk / Tehsil</label>
                        <input className={inputCls} type="text"
                            placeholder="e.g. Madurai North"
                            value={c.talukTehsil || ''}
                            onChange={e => setField('talukTehsil', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>6. District / State</label>
                        <input className={inputCls} type="text"
                            placeholder="e.g. Madurai / Tamil Nadu"
                            value={c.districtState || ''}
                            onChange={e => setField('districtState', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>9. Whether Branch is under CBS</label>
                        <select className={inputCls} value={c.isUnderCBS || 'Yes'}
                            onChange={e => setField('isUnderCBS', e.target.value)}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                </div>
                <div className="mt-6">
                    <label className={labelCls}>8. Complete Postal address with Pincode</label>
                    <textarea className={`${inputCls} h-24 resize-none`}
                        placeholder="Enter full address including pincode"
                        value={c.postalAddressWithPin || ''}
                        onChange={e => setField('postalAddressWithPin', e.target.value)} />
                </div>
            </SectionCard>

            <SectionCard title="3. Working Hours">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className={labelCls}>7.1. Week Days</label>
                        <input className={inputCls} type="text"
                            placeholder="e.g. 10:00 AM - 4:00 PM"
                            value={c.workingHoursWeekdays || ''}
                            onChange={e => setField('workingHoursWeekdays', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>7.2. Saturdays (1st, 3rd, 5th)</label>
                        <input className={inputCls} type="text"
                            placeholder="e.g. 10:00 AM - 4:00 PM"
                            value={c.workingHoursSaturdays || ''}
                            onChange={e => setField('workingHoursSaturdays', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>7.3 Holiday</label>
                        <input className={inputCls} type="text"
                            placeholder="e.g. Sunday & 2nd, 4th Saturday"
                            value={c.workingHoursHoliday || ''}
                            onChange={e => setField('workingHoursHoliday', e.target.value)} />
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="4. Contact Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelCls}>10. Mail ID</label>
                        <input className={inputCls} type="email"
                            placeholder="e.g. branch@iob.in"
                            value={c.mailId || ''}
                            onChange={e => setField('mailId', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>11. Landline Number</label>
                        <input className={inputCls} type="text"
                            placeholder="e.g. 0452-1234567"
                            value={c.landlineNumber || ''}
                            onChange={e => setField('landlineNumber', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Purpose of Request</label>
                        <ReactQuill
                            theme="snow"
                            value={c.purpose}
                            onChange={(val) => setField('purpose', val)}
                            modules={quillModules}
                            placeholder="State the purpose clearly..."
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelCls}>12. Branch Head Name and Contact No.</label>
                        <input className={inputCls} type="text"
                            placeholder="Name - Mobile Number"
                            value={c.branchHeadDetails || ''}
                            onChange={e => setField('branchHeadDetails', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelCls}>13. Controlling Office Contact Details</label>
                        <textarea className={`${inputCls} h-20 resize-none`}
                            placeholder="Controlling Office Name & Contact Info"
                            value={c.controllingOfficeDetails || ''}
                            onChange={e => setField('controllingOfficeDetails', e.target.value)} />
                    </div>
                </div>
            </SectionCard>
        </div>
    );
};
