import React from 'react';
import { SectionCard } from './SectionCard';
import { CustomDatePicker } from '../../../components/CustomDatePicker';
import { formatLocalISO, parseLocalISO } from '../../../utils/dateUtils';

interface Props {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const RBIProformaForm: React.FC<Props> = ({ formData, setFormData }) => {
    const c = formData.contentJson as any;

    const setField = (key: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev,
            contentJson: { ...prev.contentJson, [key]: value }
        }));

    const setService = (key: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev,
            contentJson: {
                ...prev.contentJson,
                rbi_services: { ...(prev.contentJson.rbi_services as any), [key]: value }
            }
        }));

    const setSchedule = (day: string, slot: string, value: string) =>
        setFormData((prev: any) => ({
            ...prev,
            contentJson: {
                ...prev.contentJson,
                rbi_schedule: {
                    ...(prev.contentJson.rbi_schedule as any),
                    [day]: { ...(prev.contentJson.rbi_schedule as any)[day], [slot]: value }
                }
            }
        }));

    const inputCls = "w-full px-4 py-2 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy bg-white";
    const labelCls = "block text-xs font-bold text-gray-500 uppercase mb-1";
    const monoCls = inputCls + " font-mono tracking-widest";
    const DAYS: [string, string][] = [
        ['allDays','All Days'], ['monday','Monday'], ['tuesday','Tuesday'],
        ['wednesday','Wednesday'], ['thursday','Thursday'], ['friday','Friday'],
        ['saturday','Saturday'], ['sunday','Sunday']
    ];
    const svc = (c.rbi_services as any) || {};

    return (
        <div className="space-y-6">

            {/* SECTION 2: Action & Unit Class */}
            <SectionCard title="Section 2 — Action for Reporting">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Action *</label>
                        <select className={inputCls} value={c.rbi_action as string}
                            onChange={e => setField('rbi_action', e.target.value)}>
                            <option value="ADDITION">Addition (Opening of new BO/unit)</option>
                            <option value="UPDATION">Updation (Update existing information)</option>
                            <option value="CLOSURE">Closure (Permanent Closed)</option>
                            <option value="MERGED">Merged</option>
                            <option value="CONVERSION">Conversion</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Outlet / Unit Class *</label>
                        <select className={inputCls} value={c.rbi_outletClass as string}
                            onChange={e => setField('rbi_outletClass', e.target.value)}>
                            <option value="BM_BRANCH">B&M Branch (Staffed by bank)</option>
                            <option value="FIXED_BC">Fixed-Point BC Outlet</option>
                            <option value="OFFICE">Office (Admin / Back Office / Treasury etc.)</option>
                            <option value="NAIO">NAIO (Extension Counter / Satellite etc.)</option>
                            <option value="OTHER_CSP">Other Fixed CSP (ATM / Kiosk etc.)</option>
                        </select>
                    </div>
                </div>
                {c.rbi_action === 'UPDATION' && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-bank-teal/10">
                        <div>
                            <label className={labelCls}>§3.1 Part-I Code (being updated)</label>
                            <input className={monoCls} type="text" value={c.rbi_updatePartICode as string}
                                onChange={e => setField('rbi_updatePartICode', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>§3.2 Effective Date of Change</label>
                            <CustomDatePicker
                                selected={parseLocalISO(c.rbi_updateEffectiveDate as string)}
                                onChange={(d: Date | null) => setField('rbi_updateEffectiveDate', formatLocalISO(d))}
                                className={inputCls}
                            />
                        </div>
                    </div>
                )}
                {c.rbi_action === 'CONVERSION' && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-bank-teal/10">
                        <div>
                            <label className={labelCls}>§4.1 Conversion From</label>
                            <input className={inputCls} type="text" placeholder="e.g. B&M Branch"
                                value={c.rbi_conversionFrom as string}
                                onChange={e => setField('rbi_conversionFrom', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>§4.2 Conversion To</label>
                            <input className={inputCls} type="text" placeholder="e.g. Fixed-Point BC Outlet"
                                value={c.rbi_conversionTo as string}
                                onChange={e => setField('rbi_conversionTo', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>§4.3 Part-I Code</label>
                            <input className={monoCls} type="text" value={c.rbi_conversionPartICode as string}
                                onChange={e => setField('rbi_conversionPartICode', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>§4.4 Conversion Date</label>
                            <CustomDatePicker
                                selected={parseLocalISO(c.rbi_conversionDate as string)}
                                onChange={(d: Date | null) => setField('rbi_conversionDate', formatLocalISO(d))}
                                className={inputCls}
                            />
                        </div>
                    </div>
                )}
            </SectionCard>

            {/* SECTION 5 — B&M Branch */}
            {c.rbi_outletClass === 'BM_BRANCH' && (
                <SectionCard title="Section 5 — B&M Branch Details">
                    <div>
                        <label className={labelCls}>§5.1.1 Domestic / Overseas Banking Unit</label>
                        <select className={inputCls} value={c.rbi_bmDomesticOverseas as string}
                            onChange={e => setField('rbi_bmDomesticOverseas', e.target.value)}>
                            <option value="DOMESTIC">Domestic Banking Unit</option>
                            <option value="OVERSEAS">Overseas Banking Unit</option>
                        </select>
                    </div>
                </SectionCard>
            )}

            {/* SECTION 5 — Fixed BC */}
            {c.rbi_outletClass === 'FIXED_BC' && (
                <SectionCard title="Section 5 — Fixed-Point BC Outlet Details">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>§5.2.1 BC Type</label>
                            <select className={inputCls} value={c.rbi_bcType as string}
                                onChange={e => setField('rbi_bcType', e.target.value)}>
                                <option value="CORPORATE">Corporate BC</option>
                                <option value="INDIVIDUAL">Individual BC</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>§5.2.2 Base/Controlling Branch Part-I Code</label>
                            <input className={monoCls} type="text" value={c.rbi_bcBasePartICode as string}
                                onChange={e => setField('rbi_bcBasePartICode', e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelCls}>§5.2.3 IBA Registration Number</label>
                            <input className={monoCls} type="text" value={c.rbi_bcIBARegNo as string}
                                onChange={e => setField('rbi_bcIBARegNo', e.target.value)} />
                        </div>
                    </div>
                </SectionCard>
            )}

            {/* SECTION 6 — Office */}
            {c.rbi_outletClass === 'OFFICE' && (
                <SectionCard title="Section 6 — Office Details">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>§6.1 Domestic / Overseas</label>
                            <select className={inputCls} value={c.rbi_officeDomesticOverseas as string}
                                onChange={e => setField('rbi_officeDomesticOverseas', e.target.value)}>
                                <option value="DOMESTIC">Domestic Office Unit</option>
                                <option value="OVERSEAS">Overseas Office Unit</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>§6.2–6.7 Office Type</label>
                            <select className={inputCls} value={c.rbi_officeType as string}
                                onChange={e => setField('rbi_officeType', e.target.value)}>
                                <option value="">Select type</option>
                                <option value="ADMIN">Administrative (HO/RO/ZO)</option>
                                <option value="TRAINING_CENTRE">Training Centre</option>
                                <option value="CPC">Central Processing Centre (CPC)</option>
                                <option value="SERVICE_BRANCH">Service Branch</option>
                                <option value="ASSET_RECOVERY">Asset Recovery Branch</option>
                                <option value="TREASURY">Treasury Branch Office</option>
                                <option value="FOREX">Forex Office</option>
                                <option value="OTHER">Any Other</option>
                            </select>
                        </div>
                        {c.rbi_officeType === 'OTHER' && (
                            <div className="md:col-span-2">
                                <label className={labelCls}>§6.7 Specify Office Type</label>
                                <input className={inputCls} type="text" value={c.rbi_officeTypeOther as string}
                                    onChange={e => setField('rbi_officeTypeOther', e.target.value)} />
                            </div>
                        )}
                        <div className="md:col-span-2">
                            <label className={labelCls}>§6.8 Part-I Code of Base Branch/Office</label>
                            <input className={monoCls} type="text" value={c.rbi_officeBasePartICode as string}
                                onChange={e => setField('rbi_officeBasePartICode', e.target.value)} />
                        </div>
                    </div>
                </SectionCard>
            )}

            {/* SECTION 7 — NAIO */}
            {c.rbi_outletClass === 'NAIO' && (
                <SectionCard title="Section 7 — NAIO Details">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>§7.1–7.6 NAIO Type</label>
                            <select className={inputCls} value={c.rbi_naioType as string}
                                onChange={e => setField('rbi_naioType', e.target.value)}>
                                <option value="">Select type</option>
                                <option value="EXTENSION_COUNTER">Extension Counter</option>
                                <option value="SATELLITE_OFFICE">Satellite Office</option>
                                <option value="EXCHANGE_BUREAU">Exchange Bureau</option>
                                <option value="REP_OFFICE">Representative Office</option>
                                <option value="CALL_CENTRE">Call Centre</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        {c.rbi_naioType === 'OTHER' && (
                            <div>
                                <label className={labelCls}>§7.6 Specify NAIO Type</label>
                                <input className={inputCls} type="text" value={c.rbi_naioTypeOther as string}
                                    onChange={e => setField('rbi_naioTypeOther', e.target.value)} />
                            </div>
                        )}
                        <div className="md:col-span-2">
                            <label className={labelCls}>§7.7 Part-I Code of Base BO/Office</label>
                            <input className={monoCls} type="text" value={c.rbi_naioBasePartICode as string}
                                onChange={e => setField('rbi_naioBasePartICode', e.target.value)} />
                        </div>
                    </div>
                </SectionCard>
            )}

            {/* SECTION 8 — Other Fixed CSP */}
            {c.rbi_outletClass === 'OTHER_CSP' && (
                <SectionCard title="Section 8 — Other Fixed CSP Details">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>§8.1 Mode of Service</label>
                            <select className={inputCls} value={c.rbi_cspMode as string}
                                onChange={e => setField('rbi_cspMode', e.target.value)}>
                                <option value="">Select mode</option>
                                <option value="ATM">ATM</option>
                                <option value="CRM">Cash Recycler Machine (CRM)</option>
                                <option value="BNAM_CDM">BNAM / Cash Deposit Machine</option>
                                <option value="EKIOSK">Electronic Kiosk</option>
                                <option value="ELOBBY">E-Lobby</option>
                                <option value="ELECTRONIC_OTHER">Electronic — Other</option>
                                <option value="MANUAL_OTHER">Manual Services (Other)</option>
                            </select>
                        </div>
                        {(c.rbi_cspMode === 'ELECTRONIC_OTHER' || c.rbi_cspMode === 'MANUAL_OTHER') && (
                            <div>
                                <label className={labelCls}>Specify Service Mode</label>
                                <input className={inputCls} type="text" value={c.rbi_cspModeOther as string}
                                    onChange={e => setField('rbi_cspModeOther', e.target.value)} />
                            </div>
                        )}
                        <div>
                            <label className={labelCls}>§8.1.3 Onsite / Off-site</label>
                            <select className={inputCls} value={c.rbi_cspOnsiteOffsite as string}
                                onChange={e => setField('rbi_cspOnsiteOffsite', e.target.value)}>
                                <option value="ONSITE">Onsite</option>
                                <option value="OFFSITE">Off-site</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>§18 Manned / Unmanned</label>
                            <select className={inputCls} value={c.rbi_cspManned as string}
                                onChange={e => setField('rbi_cspManned', e.target.value)}>
                                <option value="MANNED">Manned</option>
                                <option value="UNMANNED">Unmanned</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelCls}>§8.2 Part-I Code of Base BO/Office</label>
                            <input className={monoCls} type="text" value={c.rbi_cspBasePartICode as string}
                                onChange={e => setField('rbi_cspBasePartICode', e.target.value)} />
                        </div>
                    </div>
                </SectionCard>
            )}

            {/* SECTION 9 — BO/Office Details */}
            <SectionCard title="Section 9 — Details of Banking Outlet / Office / CSP">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className={labelCls}>§9.1 Name of Banking Outlet / Office / CSP *</label>
                        <input className={inputCls} type="text" required value={c.rbi_outletName as string}
                            onChange={e => setField('rbi_outletName', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>§9.2 Applicable Category</label>
                        <select className={inputCls} value={c.rbi_applicableCategory as string}
                            onChange={e => setField('rbi_applicableCategory', e.target.value)}>
                            <option value="GENERAL_PERMISSION">General Permission</option>
                            <option value="WITH_AUTHORISATION">With Authorisation / Approval / Licence</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>§9.6 Date of Opening (Actual / Planned) *</label>
                        <CustomDatePicker
                            selected={parseLocalISO(c.rbi_dateOfOpening as string)}
                            onChange={(d: Date | null) => setField('rbi_dateOfOpening', formatLocalISO(d))}
                            className={inputCls}
                        />
                    </div>
                    {c.rbi_applicableCategory === 'WITH_AUTHORISATION' && (<>
                        <div>
                            <label className={labelCls}>§9.3 Licence / Authorisation Letter No.</label>
                            <input className={inputCls} type="text" value={c.rbi_licenceNo as string}
                                onChange={e => setField('rbi_licenceNo', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>§9.4 Date of Licence Letter</label>
                            <CustomDatePicker
                                selected={parseLocalISO(c.rbi_licenceDate as string)}
                                onChange={(d: Date | null) => setField('rbi_licenceDate', formatLocalISO(d))}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>§9.5.1 Re-validation Reference No.</label>
                            <input className={inputCls} type="text" value={c.rbi_revalidationRef as string}
                                onChange={e => setField('rbi_revalidationRef', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>§9.5.2 Date of Re-validation</label>
                            <CustomDatePicker
                                selected={parseLocalISO(c.rbi_revalidationDate as string)}
                                onChange={(d: Date | null) => setField('rbi_revalidationDate', formatLocalISO(d))}
                                className={inputCls}
                            />
                        </div>
                    </>)}
                    <div className="md:col-span-2">
                        <label className={labelCls}>§9.7 Part-I Code of Linked Currency Chest</label>
                        <input className={monoCls} type="text" value={c.rbi_currencyChestPartICode as string}
                            onChange={e => setField('rbi_currencyChestPartICode', e.target.value)} />
                    </div>
                </div>
            </SectionCard>

            {/* SECTIONS 10–12 — Codes */}
            <SectionCard title="Sections 10–12 — Banking Codes">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={labelCls}>§10 MICR Code</label>
                        <input className={monoCls} type="text" maxLength={9} value={c.rbi_micrCode as string}
                            onChange={e => setField('rbi_micrCode', e.target.value.toUpperCase())} />
                    </div>
                    <div>
                        <label className={labelCls}>§11 IFSC Code</label>
                        <input className={monoCls} type="text" maxLength={11} value={c.rbi_ifscCode as string}
                            onChange={e => setField('rbi_ifscCode', e.target.value.toUpperCase())} />
                    </div>
                    <div>
                        <label className={labelCls}>§12 CBS (Internal) Code</label>
                        <input className={monoCls} type="text" value={c.rbi_cbsCode as string}
                            onChange={e => setField('rbi_cbsCode', e.target.value)} />
                    </div>
                </div>
            </SectionCard>

            {/* SECTION 13 — Location */}
            <SectionCard title="Section 13 — Location Details">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={labelCls}>§13.1 Country</label>
                        <input className={inputCls} type="text" value={c.rbi_country as string}
                            onChange={e => setField('rbi_country', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>§13.2 State</label>
                        <input className={inputCls} type="text" value={c.rbi_state as string}
                            onChange={e => setField('rbi_state', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>§13.3 District</label>
                        <input className={inputCls} type="text" value={c.rbi_district as string}
                            onChange={e => setField('rbi_district', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>§13.4 Sub-District</label>
                        <input className={inputCls} type="text" value={c.rbi_subDistrict as string}
                            onChange={e => setField('rbi_subDistrict', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>§13.5 Revenue Centre</label>
                        <input className={inputCls} type="text" value={c.rbi_revenueCentre as string}
                            onChange={e => setField('rbi_revenueCentre', e.target.value)} />
                    </div>
                    <div className="md:col-span-3 border-t border-bank-teal/10 pt-4">
                        <p className="text-[10px] font-bold text-bank-teal uppercase tracking-widest mb-3">§13.6 Address</p>
                    </div>
                    <div>
                        <label className={labelCls}>Address Line 1</label>
                        <input className={inputCls} type="text" value={c.rbi_addressLine1 as string}
                            onChange={e => setField('rbi_addressLine1', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Address Line 2</label>
                        <input className={inputCls} type="text" value={c.rbi_addressLine2 as string}
                            onChange={e => setField('rbi_addressLine2', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Name of Post Office</label>
                        <input className={inputCls} type="text" value={c.rbi_postOfficeName as string}
                            onChange={e => setField('rbi_postOfficeName', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Pin Code</label>
                        <input className={monoCls} type="text" maxLength={6} value={c.rbi_pinCode as string}
                            onChange={e => setField('rbi_pinCode', e.target.value)} />
                    </div>
                    <div className="md:col-span-3 border-t border-bank-teal/10 pt-4">
                        <p className="text-[10px] font-bold text-bank-teal uppercase tracking-widest mb-3">§13.7 Geo-coordinates</p>
                    </div>
                    <div>
                        <label className={labelCls}>Longitude (6 dec. places)</label>
                        <input className={monoCls} type="number" step="0.000001" value={c.rbi_longitude as string}
                            onChange={e => setField('rbi_longitude', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Latitude (6 dec. places)</label>
                        <input className={monoCls} type="number" step="0.000001" value={c.rbi_latitude as string}
                            onChange={e => setField('rbi_latitude', e.target.value)} />
                    </div>
                    <div className="md:col-span-3 border-t border-bank-teal/10 pt-4">
                        <p className="text-[10px] font-bold text-bank-teal uppercase tracking-widest mb-3">§13.8 Communication Details</p>
                    </div>
                    {c.rbi_outletClass === 'FIXED_BC' && (
                        <div>
                            <label className={labelCls}>§13.8.1 BC Contact Name</label>
                            <input className={inputCls} type="text" value={c.rbi_bcContactName as string}
                                onChange={e => setField('rbi_bcContactName', e.target.value)} />
                        </div>
                    )}
                    <div>
                        <label className={labelCls}>§13.8.2 Tel. No. (with STD)</label>
                        <input className={inputCls} type="text" value={c.rbi_telephone as string}
                            onChange={e => setField('rbi_telephone', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>§13.8.3 Mobile No.</label>
                        <input className={inputCls} type="text" value={c.rbi_mobile as string}
                            onChange={e => setField('rbi_mobile', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>§13.8.4 Fax No.</label>
                        <input className={inputCls} type="text" value={c.rbi_fax as string}
                            onChange={e => setField('rbi_fax', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>§13.8.5 Email Address</label>
                        <input className={inputCls} type="email" value={c.rbi_email as string}
                            onChange={e => setField('rbi_email', e.target.value)} />
                    </div>
                </div>
            </SectionCard>

            {/* SECTION 14 — Working Hours */}
            <SectionCard title="Section 14 — Working Days / Hours">
                <div className="flex gap-6 mb-4">
                    {['FULL_TIME', 'PART_TIME'].map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm font-bold text-bank-navy">
                            <input type="radio" name="rbi_workingType" value={opt}
                                checked={c.rbi_workingType === opt}
                                onChange={() => setField('rbi_workingType', opt)}
                                className="accent-bank-teal" />
                            {opt === 'FULL_TIME' ? 'Full Time' : 'Part Time'}
                        </label>
                    ))}
                </div>
                {c.rbi_workingType === 'FULL_TIME' ? (
                    <div>
                        <label className={labelCls}>Working Hours (e.g. 10:00–16:00, Mon–Sat)</label>
                        <input className={inputCls} type="text" value={c.rbi_fullTimeHours as string}
                            onChange={e => setField('rbi_fullTimeHours', e.target.value)} />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-bank-navy/5">
                                    <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase text-[10px]">Day</th>
                                    <th className="px-3 py-2 font-bold text-gray-500 uppercase text-[10px]">Session I From</th>
                                    <th className="px-3 py-2 font-bold text-gray-500 uppercase text-[10px]">Session I To</th>
                                    <th className="px-3 py-2 font-bold text-gray-500 uppercase text-[10px]">Session II From</th>
                                    <th className="px-3 py-2 font-bold text-gray-500 uppercase text-[10px]">Session II To</th>
                                </tr>
                            </thead>
                            <tbody>
                                {DAYS.map(([day, label]) => (
                                    <tr key={day} className="border-t border-gray-100">
                                        <td className="px-3 py-1.5 font-bold text-bank-navy text-[11px] w-28">{label}</td>
                                        {(['from', 'to', 'from2', 'to2'] as const).map(slot => (
                                            <td key={slot} className="px-2 py-1.5">
                                                <input type="time"
                                                    className="w-24 text-xs border border-gray-200 rounded px-2 py-1 font-mono outline-none focus:border-bank-teal"
                                                    value={(c.rbi_schedule as any)?.[day]?.[slot] || ''}
                                                    onChange={e => setSchedule(day, slot, e.target.value)} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </SectionCard>

            {/* SECTION 15 — Additional Centres */}
            <SectionCard title="Section 15 — Additional Centres (Hub & Spoke)">
                <div>
                    <label className={labelCls}>Additional Revenue Centres served by this Banking Outlet</label>
                    <input className={inputCls} type="text" placeholder="Comma-separated centre names"
                        value={c.rbi_additionalCentres as string}
                        onChange={e => setField('rbi_additionalCentres', e.target.value)} />
                </div>
            </SectionCard>

            {/* SECTION 16 — Services Offered */}
            <SectionCard title="Section 16 — Services Offered">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Customer Services (§16.1)</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                    {([
                        ['generalBanking',       '§16.1.1 General Banking'],
                        ['personalBanking',      '§16.1.2 Personal Banking'],
                        ['electronicSelfService','§16.1.3 Electronic Self-Service Branch'],
                        ['lockerFacility',       '§16.1.4 Locker Facility'],
                        ['moneyTransfer',        '§16.1.5 Money Transfer Facility'],
                        ['currencyChest',        '§16.1.6 Currency Chest'],
                        ['smallCoinDepot',       '§16.1.7 Small Coin Depot'],
                        ['agriFinance',          '§16.1.8.1 Agriculture Finance'],
                        ['msmeFinance',          '§16.1.8.2 MSME Finance'],
                        ['otherCorporateFinance','§16.1.8.3 Other Corporate Finance'],
                        ['forexBusiness',        '§16.1.9 Foreign Exchange Business'],
                        ['merchantBanking',      '§16.1.10.1 Merchant Banking'],
                        ['shareTrading',         '§16.1.10.2 Share Trading & Demat'],
                        ['mutualFund',           '§16.1.10.3 Mutual Fund'],
                        ['lifeInsurance',        '§16.1.11.1 Life Insurance'],
                        ['nonLifeInsurance',     '§16.1.11.2 Non-Life Insurance'],
                        ['ppfAccounts',          '§16.1.12.1 PPF Accounts'],
                        ['pensionAccounts',      '§16.1.12.2 Pension Accounts'],
                        ['frankingServices',     '§16.1.12.3 Franking Services'],
                        ['taxCollection',        '§16.1.12.4 Tax Collection'],
                    ] as [string, string][]).map(([key, label]) => (
                        <label key={key} className="flex items-start gap-2 cursor-pointer text-gray-700 hover:text-bank-navy">
                            <input type="checkbox" className="mt-0.5 accent-bank-teal"
                                checked={!!svc[key]}
                                onChange={() => setService(key, !svc[key])} />
                            <span className="text-xs leading-tight">{label}</span>
                        </label>
                    ))}
                </div>
                {c.rbi_outletClass === 'OFFICE' && (<>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4 mb-3">Administrative / Back Office Activities (§16.2)</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                        {([
                            ['treasuryAdmin',     '§16.2.1 Treasury'],
                            ['forexTreasury',     '§16.2.2 Forex Treasury'],
                            ['forexOfficeA',      '§16.2.3.1 Forex Office — A Category'],
                            ['forexOfficeB',      '§16.2.3.2 Forex Office — B Category'],
                            ['govtPension',       '§16.2.4 Govt Business / Pension'],
                            ['currencyChestAdmin','§16.2.5 Currency Chest'],
                            ['assetRecovery',     '§16.2.7 Asset Recovery'],
                            ['clearingPayments',  '§16.2.8 Clearing & Payment Services'],
                            ['processingCentres', '§16.2.9 Processing Centres'],
                            ['adminHO',           '§16.2.10 Administrative (HO/ZO/TC/AO)'],
                        ] as [string, string][]).map(([key, label]) => (
                            <label key={key} className="flex items-start gap-2 cursor-pointer text-gray-700 hover:text-bank-navy">
                                <input type="checkbox" className="mt-0.5 accent-bank-teal"
                                    checked={!!svc[key]}
                                    onChange={() => setService(key, !svc[key])} />
                                <span className="text-xs leading-tight">{label}</span>
                            </label>
                        ))}
                    </div>
                </>)}
                <div className="mt-3">
                    <label className={labelCls}>§16.1.13 / §16.2.11 Any Other (specify)</label>
                    <input className={inputCls} type="text" value={svc.otherServices || ''}
                        onChange={e => setService('otherServices', e.target.value)} />
                </div>
            </SectionCard>

            {/* SECTION 17 — Forex AD */}
            {(svc.forexBusiness || svc.forexTreasury || c.rbi_forexADCategory) && (
                <SectionCard title="Section 17 — Forex / Authorised Dealer Details">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>§17.1 Authorised Dealer Category</label>
                            <select className={inputCls} value={c.rbi_forexADCategory as string}
                                onChange={e => setField('rbi_forexADCategory', e.target.value)}>
                                <option value="">Not Applicable</option>
                                <option value="A">Category A</option>
                                <option value="B">Category B</option>
                                <option value="C">Category C</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>§17.2 Date of Authorisation</label>
                            <CustomDatePicker
                                selected={parseLocalISO(c.rbi_forexAuthDate as string)}
                                onChange={(d: Date | null) => setField('rbi_forexAuthDate', formatLocalISO(d))}
                                className={inputCls}
                            />
                        </div>
                        {c.rbi_forexADCategory === 'C' && (
                            <div className="md:col-span-2">
                                <label className={labelCls}>§17.3 Part-I Code of Settling A/B Branch</label>
                                <input className={monoCls} type="text" value={c.rbi_forexSettlingPartICode as string}
                                    onChange={e => setField('rbi_forexSettlingPartICode', e.target.value)} />
                            </div>
                        )}
                    </div>
                </SectionCard>
            )}

            {/* SECTION 19 — Remarks */}
            <SectionCard title="Section 19 — Remarks">
                <div>
                    <label className={labelCls}>Remarks / Additional Notes</label>
                    <textarea rows={4} className={inputCls}
                        value={c.rbi_remarks as string}
                        onChange={e => setField('rbi_remarks', e.target.value)} />
                </div>
            </SectionCard>

        </div>
    );
};
