import React, { useState, useEffect } from 'react';
import { 
    Plus, FileText, Download, Pencil, Trash2, Clock, CheckCircle, X, 
    LayoutDashboard, User, Calendar, IndianRupee, Building2, Layers, 
    Hash, Lock, Unlock, Copy, AlertTriangle, FileSpreadsheet, Eye, Save, Award
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { CustomDatePicker } from '../components/CustomDatePicker';
import api from '../services/api';
import { getErrorMessage } from '../utils/handleError';
import { formatLocalISO, parseLocalISO } from '../utils/dateUtils';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import DocumentPreview from '../components/DocumentPreview';
import { REGIONAL_OFFICE_DATA, GLOBAL_CONFIG } from '../constants/organization';
import { useAuth } from '../context/AuthContext';

const quillModules = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        ['link', 'table'],
        ['clean']
    ],
};

const quillStyle = `
  .quill { 
    background: white;
    border-radius: 0.75rem;
    overflow: hidden;
    border: 2px solid #f3f4f6 !important;
  }
  .ql-toolbar { 
    border: none !important; 
    border-bottom: 2px solid #f3f4f6 !important; 
    background: #f9fafb;
  }
  .ql-container { 
    border: none !important;
    min-height: 150px;
    font-family: inherit;
  }
  .ql-editor { 
    font-size: 0.875rem;
    line-height: 1.6;
    color: #1e293b;
  }
  .ql-editor.ql-blank::before {
    color: #9ca3af;
    font-style: normal;
  }
`;


interface OfficeNote {
    id: string;
    type: string;
    status: string;
    titleEn: string;
    isFrozen?: boolean;
    contentJson: string;
    referenceNo?: string;
    scannedCopyUrl?: string; // New field for signed copy
    preparer: { id: string, fullNameEn: string, username: string, branchId?: string };
    createdAt: string;
}

const INITIAL_FORM = {
    type: 'CUSTOM',
    titleEn: '',
    titleTa: '',
    titleHi: '',
    deptName: '',
    referenceNo: '',
    preparerId: '',
    contentJson: {
        details: '',
        amount: '',
        branch: '',
        justification: '',
        reference: '',
        dateOfOpening: '',
        branchName: '',
        permissionDetails: '',
        populationCategory: 'RURAL',
        populationCentre: '',
        communityBlock: '',
        talukTehsil: '',
        districtState: '',
        workingHours: '',
        branchCode: '',
        postalAddress: '',
        currencyChest: '',
        authorisedDealer: '',
        underCBS: 'Yes',
        micrCode: '',
        ifscCode: '',
        cbsCode: '',
        addressLine1: '',
        addressLine2: '',
        postOfficeName: '',
        pinCode: '',
        longitude: '',
        latitude: '',
        telNo: '',
        mobileNo: '',
        faxNo: '',
        emailAddress: '',
        revenueCentre: '',
        // MICR specific fields (some overlapping)
        workingHoursWeekdays: '',
        workingHoursSaturdays: '',
        workingHoursHoliday: '',
        postalAddressWithPin: '',
        isUnderCBS: 'Yes',
        mailId: '',
        landlineNumber: '',
        branchHeadDetails: '',
        controllingOfficeDetails: '',
        // ─── HIGH_VALUE_DD specific fields ─────────────────────────────────
        applicantName: '',
        applicantAccount: '',
        kycCompliance: 'Yes',
        dateOfIssue: '',
        instrumentDetails: '',
        beneficiaryName: '',
        beneficiaryAccount: '',
        beneficiaryBankBranch: '',
        ddFavouring: '',
        ddDrawnOn: '',
        purpose: '',
        transactionId: '',
        noteDate: '', // Pickable date for the header
        branchSol: '', // Branch SOL ID
        branchHeadGrade: '', // Grade of Branch head (Auto-populated)
        issuingBranch: '', // Auto-populated Issuing Branch
        policyCirculars: [{ dept: 'Central Office, Dept. of GAD', date: '', ref: '' }] as {dept: string, date: string, ref: string}[],
        // ─── GL_HEAD_ACTIVATION specific fields ─────────────────────────────
        glAccountNo: '',
        glAccountDesc: '',
        glOwnershipDept: '',
        glOperationUser: '',
        glPurpose: '',
        glOpType: 'Both',
        glDrCrBoth: 'Both',
        glAssetLiability: 'Liability',
        glActivity: 'Generic',
        glLimits: 'No',
        glMonitoringDept: 'RO Accounts',
        glOperationBy: 'Branch only',
        glCashOp: 'No',
        glReconMandate: 'Reconciliation to zero by same day',
        // ─── RBI_BO_PROFORMA fields ────────────────────────────────────────
        rbi_action: 'ADDITION' as string,
        rbi_updatePartICode: '',
        rbi_updateEffectiveDate: '',
        rbi_conversionFrom: '',
        rbi_conversionTo: '',
        rbi_conversionPartICode: '',
        rbi_conversionDate: '',
        rbi_outletClass: 'BM_BRANCH' as string,
        rbi_bmDomesticOverseas: 'DOMESTIC' as string,
        rbi_bcType: 'CORPORATE' as string,
        rbi_bcBasePartICode: '',
        rbi_bcIBARegNo: '',
        rbi_officeDomesticOverseas: 'DOMESTIC' as string,
        rbi_officeType: '',
        rbi_officeTypeOther: '',
        rbi_officeBasePartICode: '',
        rbi_naioType: '',
        rbi_naioTypeOther: '',
        rbi_naioBasePartICode: '',
        rbi_cspMode: '',
        rbi_cspModeOther: '',
        rbi_cspOnsiteOffsite: 'ONSITE' as string,
        rbi_cspBasePartICode: '',
        rbi_outletName: '',
        rbi_applicableCategory: 'GENERAL_PERMISSION' as string,
        rbi_licenceNo: '',
        rbi_licenceDate: '',
        rbi_revalidationRef: '',
        rbi_revalidationDate: '',
        rbi_dateOfOpening: '',
        rbi_currencyChestPartICode: '',
        rbi_micrCode: '',
        rbi_ifscCode: '',
        rbi_cbsCode: '',
        rbi_country: 'India',
        rbi_state: '',
        rbi_district: '',
        rbi_subDistrict: '',
        rbi_revenueCentre: '',
        rbi_addressLine1: '',
        rbi_addressLine2: '',
        rbi_postOfficeName: '',
        rbi_pinCode: '',
        rbi_longitude: '',
        rbi_latitude: '',
        rbi_bcContactName: '',
        rbi_telephone: '',
        rbi_mobile: '',
        rbi_fax: '',
        rbi_email: '',
        rbi_workingType: 'FULL_TIME' as string,
        rbi_fullTimeHours: '',
        rbi_schedule: {
            allDays:   { from: '', to: '', from2: '', to2: '' },
            monday:    { from: '', to: '', from2: '', to2: '' },
            tuesday:   { from: '', to: '', from2: '', to2: '' },
            wednesday: { from: '', to: '', from2: '', to2: '' },
            thursday:  { from: '', to: '', from2: '', to2: '' },
            friday:    { from: '', to: '', from2: '', to2: '' },
            saturday:  { from: '', to: '', from2: '', to2: '' },
            sunday:    { from: '', to: '', from2: '', to2: '' },
        } as Record<string, Record<string, string>>,
        rbi_additionalCentres: '',
        rbi_services: {
            generalBanking: false,
            personalBanking: false,
            electronicSelfService: false,
            lockerFacility: false,
            moneyTransfer: false,
            currencyChest: false,
            smallCoinDepot: false,
            agriFinance: false,
            msmeFinance: false,
            otherCorporateFinance: false,
            forexBusiness: false,
            merchantBanking: false,
            shareTrading: false,
            mutualFund: false,
            lifeInsurance: false,
            nonLifeInsurance: false,
            ppfAccounts: false,
            pensionAccounts: false,
            frankingServices: false,
            taxCollection: false,
            treasuryAdmin: false,
            forexTreasury: false,
            forexOfficeA: false,
            forexOfficeB: false,
            govtPension: false,
            currencyChestAdmin: false,
            assetRecovery: false,
            clearingPayments: false,
            processingCentres: false,
            adminHO: false,
            otherServices: '',
        } as Record<string, any>,
        rbi_forexADCategory: '',
        rbi_forexAuthDate: '',
        rbi_forexSettlingPartICode: '',
        rbi_cspManned: 'MANNED' as string,
        rbi_remarks: '',
        // ─── EXPENSE_APPROVAL fields ───────────────────────────────────────
        expenseCategory: 'REVENUE' as string,
        budgetHead: '',
        budgetAllocated: '',
        budgetUtilized: '',
        proposedAmount: '',
        vendorName: '',
        vendorPan: '',
        vendorGst: '',
        tdsApplicable: 'Yes' as string,
        gstApplicable: 'Yes' as string,
        quotationBasis: 'L1' as string,
        quotationDetails: '',
        expensePurpose: '',
        recommendation: '',
        // ─── BROKEN_INTEREST fields ──────────────────────────────────────────────
        // ─ Customer / Deposit identifiers
        cifId: '',
        tdAccountNo: '',
        depositorType: 'Individual' as string,
        customerDob: '',
        customerAge: '',
        depositOpenDate: '',
        contractRate: '',
        // ─ Rate criteria
        brokenPeriodStart: '',
        brokenPeriodEnd: '',
        brokenPeriodDays: '',
        principalAmount: '',
        claimedInterestRate: '',
        customerCategory: 'General' as string,
        additionalSpread: '0' as string,
        effectiveInterestRate: '',
        compoundingFrequency: 'SIMPLE' as string,
        calculatedInterest: '',
        brokenPeriodJustification: '',
        // ─── REVERSAL_CHARGES fields ───────────────────────────────────────
        revCustomerName: '',
        revAccountNumber: '',
        revCifId: '',
        revChargeType: 'SMS Charges' as string,
        revOriginalChargeDate: '',
        revOriginalChargeAmount: '',
        revReversalAmount: '',
        revReason: 'Bank Error' as string,
        revJustification: '',
        // ─── GL_HEAD_ACTIVATION fields (Moved up) ───────────────────────────
        glFinacleMandatory: 'Yes' as string,
        glPointerFacility: 'Yes' as string,
        glRevokeStatus: '',
        glRoPower: 'No' as string,
        glReconZeroEod: 'No' as string,
        scope: 'BRANCH' as string,
        regionName: 'Dindigul Region' as string,
    }
};

// ─── MICR Code Request Form Component ─────────────────────────────────────
const MICRRequestForm: React.FC<{
    formData: typeof INITIAL_FORM;
    setFormData: React.Dispatch<React.SetStateAction<typeof INITIAL_FORM>>;
}> = ({ formData, setFormData }) => {
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

// ─── Expense Approval Form Component ─────────────────────────────────────
const ExpenseApprovalForm: React.FC<{
    formData: typeof INITIAL_FORM;
    setFormData: React.Dispatch<React.SetStateAction<typeof INITIAL_FORM>>;
}> = ({ formData, setFormData }) => {
    const c = formData.contentJson as typeof INITIAL_FORM.contentJson;
    const setField = (key: string, value: any) =>
        setFormData(prev => ({
            ...prev,
            contentJson: { ...prev.contentJson, [key]: value }
        }));
    const inputCls = "w-full px-4 py-2 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy bg-white";
    const labelCls = "block text-xs font-bold text-gray-500 uppercase mb-1";
    
    return (
        <div className="space-y-6">
            <SectionCard title="1. Expense Categorization & Budget Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Expense Category *</label>
                        <select className={inputCls} value={c.expenseCategory as string} onChange={e => setField('expenseCategory', e.target.value)}>
                            <option value="REVENUE">Revenue Expenditure</option>
                            <option value="CAPITAL">Capital Expenditure</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>General Ledger (GL) Budget Head *</label>
                        <select className={inputCls} value={c.budgetHead as string} onChange={e => setField('budgetHead', e.target.value)}>
                            <option value="">Select or Type Below</option>
                            <option value="Repairs and Maintenance">Repairs and Maintenance</option>
                            <option value="Printing and Stationery">Printing and Stationery</option>
                            <option value="Advertisement and Publicity">Advertisement and Publicity</option>
                            <option value="Travelling Expenses">Travelling Expenses</option>
                            <option value="Legal Charges">Legal Charges</option>
                            <option value="Other Expenditure (Sundries)">Other Expenditure (Sundries)</option>
                        </select>
                        <input type="text" className={`mt-2 ${inputCls}`} placeholder="Or type custom budget head..." value={c.budgetHead as string} onChange={e => setField('budgetHead', e.target.value)} />
                    </div>
                    {c.budgetHead === 'Other Expenditure (Sundries)' && (
                        <>
                            <div>
                                <label className={labelCls}>FY Allocated Budget (₹)</label>
                                <input className={inputCls} type="number" placeholder="Enter Amount" value={c.budgetAllocated as string} onChange={e => setField('budgetAllocated', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls}>Utilised Budget till Date (₹)</label>
                                <input className={inputCls} type="number" placeholder="Enter Amount" value={c.budgetUtilized as string} onChange={e => setField('budgetUtilized', e.target.value)} />
                            </div>
                        </>
                    )}
                </div>
            </SectionCard>
            
            <SectionCard title="2. Proposal & Vendor Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Purpose & Details of Expense</label>
                        <ReactQuill theme="snow" value={c.expensePurpose as string} onChange={(val) => setField('expensePurpose', val)} modules={quillModules} placeholder="Explain why this expense is necessary..." />
                    </div>
                    <div>
                        <label className={labelCls}>Proposed Expenditure Amount (₹) *</label>
                        <input className={inputCls} type="number" required placeholder="Enter Proposed Amount" value={c.proposedAmount as string} onChange={e => setField('proposedAmount', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Quotation Basis *</label>
                        <select className={inputCls} value={c.quotationBasis as string} onChange={e => setField('quotationBasis', e.target.value)}>
                            <option value="L1">L1 out of 3 Quotations</option>
                            <option value="SINGLE">Single Dispensation / Proprietary</option>
                            <option value="EMPANELED">Empaneled Vendor</option>
                            <option value="NA">Not Applicable / Subscription</option>
                        </select>
                    </div>
                    {c.quotationBasis === 'L1' && (
                        <div className="md:col-span-2">
                            <label className={labelCls}>Quotation Details (L1, L2, L3)</label>
                            <textarea rows={2} className={inputCls} placeholder="e.g. L1: Vendor A (₹2000), L2: Vendor B (₹2500)..." value={c.quotationDetails as string} onChange={e => setField('quotationDetails', e.target.value)} />
                        </div>
                    )}
                    <div className="md:col-span-2 border-t pt-2 mt-2">
                        <p className="text-xs font-bold text-bank-teal uppercase mb-2">Selected Vendor Information</p>
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelCls}>Name of Vendor / Beneficiary</label>
                        <input className={inputCls} type="text" placeholder="Vendor Name" value={c.vendorName as string} onChange={e => setField('vendorName', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Vendor PAN</label>
                        <input className={inputCls} type="text" placeholder="ABCDE1234F" value={c.vendorPan as string} onChange={e => setField('vendorPan', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Vendor GSTIN</label>
                        <input className={inputCls} type="text" placeholder="22ABCDE1234F1Z5" value={c.vendorGst as string} onChange={e => setField('vendorGst', e.target.value)} />
                    </div>
                </div>
            </SectionCard>
            
            <SectionCard title="3. Statutory Requirements & Recommendation">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Is TDS Applicable? *</label>
                        <select className={inputCls} value={c.tdsApplicable as string} onChange={e => setField('tdsApplicable', e.target.value)}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Is GST Applicable? *</label>
                        <select className={inputCls} value={c.gstApplicable as string} onChange={e => setField('gstApplicable', e.target.value)}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Specific Recommendation</label>
                        <ReactQuill theme="snow" value={c.recommendation as string} onChange={(val) => setField('recommendation', val)} modules={quillModules} placeholder="Summarize your final recommendation..." />
                    </div>
                </div>
            </SectionCard>
        </div>
    );
};

// helper: compute interest based on simple or compound frequency
// freq: SIMPLE | QUARTERLY | MONTHLY | HALFYEARLY | ANNUALLY
const calcInterestBI = (
    principal: string | number,
    effectiveRate: string | number,
    days: string | number,
    freq: string
): string => {
    const p = parseFloat(String(principal)) || 0;
    const r = parseFloat(String(effectiveRate)) || 0;
    const d = parseFloat(String(days)) || 0;
    if (p <= 0 || r <= 0 || d <= 0) return '';
    const rDec = r / 100;
    if (freq === 'SIMPLE') {
        // Simple interest: P x R x D / 365 (per RBI Para 2.3)
        return (p * rDec * d / 365).toFixed(2);
    }
    // Compound interest: A = P x (1 + r/n)^(n x t), Interest = A - P
    // t is in years = D / 365
    const n = freq === 'MONTHLY' ? 12 : freq === 'QUARTERLY' ? 4 : freq === 'HALFYEARLY' ? 2 : 1;
    const t = d / 365;
    const maturity = p * Math.pow(1 + rDec / n, n * t);
    return (maturity - p).toFixed(2);
};

// ─── Broken Period Interest Form Component ───────────────────────────────
const BrokenPeriodInterestForm: React.FC<{
    formData: typeof INITIAL_FORM;
    setFormData: React.Dispatch<React.SetStateAction<typeof INITIAL_FORM>>;
}> = ({ formData, setFormData }) => {
    const c = formData.contentJson as typeof INITIAL_FORM.contentJson;
    const setField = (key: string, value: any) =>
        setFormData(prev => ({
            ...prev,
            contentJson: { ...prev.contentJson, [key]: value }
        }));
    const inputCls = "w-full px-4 py-2 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy bg-white";
    const labelCls = "block text-xs font-bold text-gray-500 uppercase mb-1";
    
    const handleCategoryChange = (val: string) => {
        let spread = '0';
        if (val === 'Senior Citizen') spread = '0.50';
        if (val === 'Super Senior Citizen') spread = '0.75';
        setFormData(prev => {
            const currentC = prev.contentJson as any;
            const baseRate = parseFloat(currentC.claimedInterestRate || '0') || 0;
            const newSpread = parseFloat(spread) || 0;
            const effective = (baseRate + newSpread).toFixed(2);
            return {
                ...prev,
                contentJson: {
                    ...currentC,
                    customerCategory: val,
                    additionalSpread: spread,
                    effectiveInterestRate: effective !== '0.00' ? effective : '',
                    calculatedInterest: calcInterestBI(currentC.principalAmount, effective, currentC.brokenPeriodDays, currentC.compoundingFrequency || 'SIMPLE')
                }
            };
        });
    };

    const handleRateSpreadChange = (key: 'claimedInterestRate' | 'additionalSpread', val: string) => {
        setFormData(prev => {
            const currentC = prev.contentJson as any;
            const baseRate = key === 'claimedInterestRate' ? parseFloat(val) : parseFloat(currentC.claimedInterestRate || '0');
            const spread = key === 'additionalSpread' ? parseFloat(val) : parseFloat(currentC.additionalSpread || '0');
            const effective = ((baseRate || 0) + (spread || 0)).toFixed(2);
            return {
                ...prev,
                contentJson: {
                    ...currentC,
                    [key]: val,
                    effectiveInterestRate: effective !== '0.00' ? effective : '',
                    calculatedInterest: calcInterestBI(currentC.principalAmount, effective, currentC.brokenPeriodDays, currentC.compoundingFrequency || 'SIMPLE')
                }
            };
        });
    };

    const handlePrincipalChange = (val: string) => {
        setFormData(prev => {
            const currentC = prev.contentJson as any;
            return {
                ...prev,
                contentJson: {
                    ...currentC,
                    principalAmount: val,
                    calculatedInterest: calcInterestBI(val, currentC.effectiveInterestRate, currentC.brokenPeriodDays, currentC.compoundingFrequency || 'SIMPLE')
                }
            };
        });
    };

    const handleFrequencyChange = (val: string) => {
        setFormData(prev => {
            const currentC = prev.contentJson as any;
            return {
                ...prev,
                contentJson: {
                    ...currentC,
                    compoundingFrequency: val,
                    calculatedInterest: calcInterestBI(currentC.principalAmount, currentC.effectiveInterestRate, currentC.brokenPeriodDays, val)
                }
            };
        });
    };

    const handleDateChange = (key: 'brokenPeriodStart' | 'brokenPeriodEnd', val: string) => {
        setFormData(prev => {
            const currentC = prev.contentJson as any;
            const startStr = key === 'brokenPeriodStart' ? val : currentC.brokenPeriodStart;
            const endStr = key === 'brokenPeriodEnd' ? val : currentC.brokenPeriodEnd;
            let days = currentC.brokenPeriodDays;
            if (startStr && endStr) {
                const start = new Date(startStr);
                const end = new Date(endStr);
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    const diffTime = Math.abs(end.getTime() - start.getTime());
                    days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)).toString();
                }
            }
            return {
                ...prev,
                contentJson: {
                    ...currentC,
                    [key]: val,
                    brokenPeriodDays: days,
                    calculatedInterest: calcInterestBI(currentC.principalAmount, currentC.effectiveInterestRate, days, currentC.compoundingFrequency || 'SIMPLE')
                }
            };
        });
    };

    // DOB -> age and category auto-calc
    const handleDobChange = (val: string) => {
        setFormData(prev => {
            const currentC = prev.contentJson as any;
            let age = '';
            let category = 'General';
            let spread = '0';

            if (val) {
                const dob = new Date(val);
                const today = new Date();
                if (!isNaN(dob.getTime())) {
                    let yr = today.getFullYear() - dob.getFullYear();
                    const m = today.getMonth() - dob.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) yr--;
                    age = String(yr);

                    const ageNum = parseInt(age);
                    if (ageNum >= 80) {
                        category = 'Super Senior Citizen';
                        spread = '0.75';
                    } else if (ageNum >= 60) {
                        category = 'Senior Citizen';
                        spread = '0.50';
                    }
                }
            }

            const baseRateNum = parseFloat(currentC.claimedInterestRate || '0') || 0;
            const spreadNum = parseFloat(spread) || 0;
            const effective = ((baseRateNum || 0) + (spreadNum || 0)).toFixed(2);

            return {
                ...prev,
                contentJson: {
                    ...currentC,
                    customerDob: val,
                    customerAge: age,
                    customerCategory: category,
                    additionalSpread: spread,
                    effectiveInterestRate: effective !== '0.00' ? effective : '',
                    calculatedInterest: calcInterestBI(currentC.principalAmount, effective, currentC.brokenPeriodDays, currentC.compoundingFrequency || 'SIMPLE')
                }
            };
        });
    };

    const handleDepositorTypeChange = (val: string) => {
        setFormData(prev => {
            const currentC = prev.contentJson as any;
            const isOrg = val === 'Organization';
            const category = isOrg ? 'General' : currentC.customerCategory;
            const spread = isOrg ? '0' : currentC.additionalSpread;
            const dob = isOrg ? '' : currentC.customerDob;
            const age = isOrg ? '' : currentC.customerAge;

            const baseRateNum = parseFloat(currentC.claimedInterestRate || '0') || 0;
            const spreadNum = parseFloat(spread) || 0;
            const effective = ((baseRateNum || 0) + (spreadNum || 0)).toFixed(2);

            return {
                ...prev,
                contentJson: {
                    ...currentC,
                    depositorType: val,
                    customerDob: dob,
                    customerAge: age,
                    customerCategory: category,
                    additionalSpread: spread,
                    effectiveInterestRate: effective !== '0.00' ? effective : '',
                    calculatedInterest: calcInterestBI(currentC.principalAmount, effective, currentC.brokenPeriodDays, currentC.compoundingFrequency || 'SIMPLE')
                }
            };
        });
    };

    const freq = (c.compoundingFrequency as string) || 'SIMPLE';
    const freqLabel: Record<string, string> = {
        SIMPLE: 'Simple Interest (P × R × D / 365)',
        QUARTERLY: 'Compound — Quarterly [P×(1+R/400)^(4×t)]',
        MONTHLY: 'Compound — Monthly [P×(1+R/1200)^(12×t)]',
        HALFYEARLY: 'Compound — Half-Yearly [P×(1+R/200)^(2×t)]',
        ANNUALLY: 'Compound — Annually [P×(1+R/100)^t]',
    };
    const interestFormatted = c.calculatedInterest
        ? `₹ ${Number(c.calculatedInterest).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : '';
    const formulaHint = c.calculatedInterest && c.principalAmount ? (
        freq === 'SIMPLE'
            ? `= ₹${Number(c.principalAmount).toLocaleString('en-IN')} × ${c.effectiveInterestRate}% × ${c.brokenPeriodDays} days ÷ 365`
            : `= ₹${Number(c.principalAmount).toLocaleString('en-IN')} × (1 + ${c.effectiveInterestRate}%÷${{ QUARTERLY:4, MONTHLY:12, HALFYEARLY:2, ANNUALLY:1 }[freq]})^(${{ QUARTERLY:4, MONTHLY:12, HALFYEARLY:2, ANNUALLY:1 }[freq]}×${(parseFloat(String(c.brokenPeriodDays))/365).toFixed(4)}y) − P`
    ) : null;

    return (
        <div className="space-y-6">
            {/* ─── Section 1: Depositor & Deposit Details ─── */}
            <SectionCard title="1. Depositor &amp; Deposit Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Depositor Type *</label>
                        <select className={inputCls} value={(c.depositorType as string) || 'Individual'} onChange={e => handleDepositorTypeChange(e.target.value)}>
                            <option value="Individual">Individual</option>
                            <option value="Organization">Organization / Non-Individual</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Customer Category *</label>
                        <select className={inputCls} value={c.customerCategory as string} onChange={e => handleCategoryChange(e.target.value)}
                            disabled={(c.depositorType as string) === 'Organization'}>
                            <option value="General">General / Ordinary</option>
                            <option value="Senior Citizen">Senior Citizen (60–79 yrs)</option>
                            <option value="Super Senior Citizen">Super Senior Citizen (80+ yrs)</option>
                        </select>
                        {(c.depositorType as string) === 'Organization' && (
                            <p className="text-xs text-gray-400 mt-1">ⓘ Senior Citizen spread not applicable for organizations.</p>
                        )}
                    </div>
                    <div>
                        <label className={labelCls}>CIF ID / Customer ID *</label>
                        <input className={inputCls} type="text" placeholder="e.g. CIF1234567" value={(c.cifId as string) || ''} onChange={e => setField('cifId', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>TD / FD Account Number *</label>
                        <input className={inputCls} type="text" placeholder="e.g. 123456789012" value={(c.tdAccountNo as string) || ''} onChange={e => setField('tdAccountNo', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Deposit Open Date *</label>
                        <input className={inputCls} type="date" value={(c.depositOpenDate as string) || ''} onChange={e => setField('depositOpenDate', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Contract Rate (%) *</label>
                        <input className={inputCls} type="number" step="0.01" placeholder="Original rate as per contract" value={(c.contractRate as string) || ''} onChange={e => setField('contractRate', e.target.value)} />
                    </div>
                    {(c.depositorType as string) !== 'Organization' && (
                        <>
                            <div>
                                <label className={labelCls}>Date of Birth *</label>
                                <input className={inputCls} type="date" value={(c.customerDob as string) || ''} onChange={e => handleDobChange(e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls}>Age (Years)</label>
                                <input className={`${inputCls} bg-gray-100 font-bold`} type="text" readOnly placeholder="Auto-calculated" value={(c.customerAge as string) || ''} />
                            </div>
                        </>
                    )}
                    {(c.depositorType as string) === 'Organization' && (
                        <div className="md:col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                            ⓘ Date of Birth &amp; Age: <strong>N/A</strong> (Organization / Non-Individual depositor)
                        </div>
                    )}
                </div>
            </SectionCard>

            {/* ─── Section 2: Rate Criteria ─── */}
            <SectionCard title="2. Rate Criteria">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Base Interest Rate Claimed (%) *</label>
                        <input className={inputCls} type="number" step="0.01" placeholder="e.g. 6.50" value={c.claimedInterestRate as string} onChange={e => handleRateSpreadChange('claimedInterestRate', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Additional Spread (%) *</label>
                        <input className={inputCls} type="number" step="0.01" placeholder="e.g. 0.50" value={c.additionalSpread as string} onChange={e => handleRateSpreadChange('additionalSpread', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelCls}>Effective Interest Rate (%)</label>
                        <input className={`${inputCls} bg-gray-100 font-bold`} type="number" step="0.01" placeholder="Auto-calculated" readOnly value={c.effectiveInterestRate as string} />
                    </div>
                </div>
            </SectionCard>

            {/* ─── Section 3: Broken Period Details ─── */}
            <SectionCard title="3. Broken Period Details">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={labelCls}>Period Start Date *</label>
                        <input className={inputCls} type="date" value={c.brokenPeriodStart as string} onChange={e => handleDateChange('brokenPeriodStart', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Period End Date *</label>
                        <input className={inputCls} type="date" value={c.brokenPeriodEnd as string} onChange={e => handleDateChange('brokenPeriodEnd', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Total Days *</label>
                        <input className={inputCls} type="number" placeholder="Auto-calculated" value={c.brokenPeriodDays as string} onChange={e => setField('brokenPeriodDays', e.target.value)} />
                    </div>
                </div>
            </SectionCard>

            {/* ─── Section 4: Interest Calculation ─── */}
            <SectionCard title={`4. Interest Calculation — ${freqLabel[freq] || freq}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Compounding Frequency *</label>
                        <select className={inputCls} value={freq} onChange={e => handleFrequencyChange(e.target.value)}>
                            <option value="SIMPLE">Simple Interest (broken period — RBI Para 2.3)</option>
                            <option value="QUARTERLY">Compound — Quarterly (standard FD)</option>
                            <option value="MONTHLY">Compound — Monthly</option>
                            <option value="HALFYEARLY">Compound — Half-Yearly</option>
                            <option value="ANNUALLY">Compound — Annually</option>
                        </select>
                        {freq === 'SIMPLE' && (
                            <p className="text-xs text-gray-400 mt-1">ⓘ RBI Para 2.3: Broken period interest paid at simple rate for actual days, year reckoned at 365 days.</p>
                        )}
                        {freq !== 'SIMPLE' && (
                            <p className="text-xs text-amber-600 mt-1">⚠️ Compound mode: Interest = Maturity Value − Principal. Suitable for full-term calculations.</p>
                        )}
                    </div>
                    <div>
                        <label className={labelCls}>Principal / Deposit Amount (₹) *</label>
                        <input className={inputCls} type="number" step="0.01" placeholder="e.g. 500000" value={c.principalAmount as string} onChange={e => handlePrincipalChange(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelCls}>Broken Period Interest Amount (₹)</label>
                        <div className={`${inputCls} bg-green-50 border-green-200 font-bold text-green-800 flex items-center`}>
                            {interestFormatted || <span className="text-gray-400 font-normal">Auto-calculated</span>}
                        </div>
                        {formulaHint && <p className="text-xs text-gray-500 mt-1">{formulaHint}</p>}
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Justification for Broken Period</label>
                        <ReactQuill theme="snow" value={c.brokenPeriodJustification as string} onChange={(val) => setField('brokenPeriodJustification', val)} modules={quillModules} placeholder="Provide technical or business justification..." />
                    </div>
                </div>
            </SectionCard>
        </div>
    );
};

// ─── Reversal of Charges Form Component ─────────────────────────────────────
const ReversalChargesForm: React.FC<{
    formData: typeof INITIAL_FORM;
    setFormData: React.Dispatch<React.SetStateAction<typeof INITIAL_FORM>>;
}> = ({ formData, setFormData }) => {
    const c = formData.contentJson as any;
    const setField = (key: string, value: any) =>
        setFormData(prev => ({
            ...prev,
            contentJson: { ...prev.contentJson, [key]: value }
        }));
    const inputCls = "w-full px-4 py-2 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy bg-white";
    const labelCls = "block text-xs font-bold text-gray-500 uppercase mb-1";

    return (
        <div className="space-y-6">
            <SectionCard title="1. Account / Customer Details">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={labelCls}>Customer Name *</label>
                        <input className={inputCls} type="text" placeholder="e.g. John Doe" value={c.revCustomerName || ''} onChange={e => setField('revCustomerName', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Account Number *</label>
                        <input className={inputCls} type="text" placeholder="e.g. 123456789012" value={c.revAccountNumber || ''} onChange={e => setField('revAccountNumber', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>CIF ID / Customer ID *</label>
                        <input className={inputCls} type="text" placeholder="e.g. CIF1234567" value={c.revCifId || ''} onChange={e => setField('revCifId', e.target.value)} />
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="2. Original Charge Details">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={labelCls}>Charge Type *</label>
                        <select className={inputCls} value={c.revChargeType || 'SMS Charges'} onChange={e => setField('revChargeType', e.target.value)}>
                            <option value="SMS Charges">SMS Charges</option>
                            <option value="LRS (Ledger Folio)">LRS (Ledger Folio)</option>
                            <option value="AMC Charges">AMC (Annual Maintenance)</option>
                            <option value="Cheque Return">Cheque Return (Bounce)</option>
                            <option value="Stop Payment">Stop Payment / Hotlisting</option>
                            <option value="Processing Fee">Processing Fee</option>
                            <option value="Penalty Interest">Penalty Interest</option>
                            <option value="Other">Other Charges</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Date of Original Charge *</label>
                        <input className={inputCls} type="date" value={c.revOriginalChargeDate || ''} onChange={e => setField('revOriginalChargeDate', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Original Amount Charged (₹) *</label>
                        <input className={inputCls} type="number" step="0.01" placeholder="e.g. 177.00" value={c.revOriginalChargeAmount || ''} onChange={e => setField('revOriginalChargeAmount', e.target.value)} />
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="3. Reversal Justification">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Amount to be Reversed (₹) *</label>
                        <input className={inputCls} type="number" step="0.01" placeholder="e.g. 177.00" value={c.revReversalAmount || ''} onChange={e => setField('revReversalAmount', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Reason for Reversal *</label>
                        <select className={inputCls} value={c.revReason || 'Bank Error'} onChange={e => setField('revReason', e.target.value)}>
                            <option value="Bank Error">Bank Error / Staff Mistake</option>
                            <option value="System Error">System Glitch / Technical Error</option>
                            <option value="Customer Request (First Time)">Customer Request (First Time Waiver)</option>
                            <option value="Customer Goodwill">Customer Relationship / Goodwill</option>
                            <option value="Fee Waiver Approved by RO">Fee Waiver (As per RO Sanction)</option>
                            <option value="Other">Other Justification</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelCls}>Detailed Justification / Narrative *</label>
                        <ReactQuill theme="snow" value={c.revJustification} onChange={(val) => setField('revJustification', val)} modules={quillModules} placeholder="Provide detailed background for this reversal request..." />
                    </div>
                </div>
            </SectionCard>
        </div>
    );
};


// ─── GL Head Activation Form Component ─────────────────────────────────────
const GLHeadActivationForm: React.FC<{
    formData: typeof INITIAL_FORM;
    setFormData: React.Dispatch<React.SetStateAction<typeof INITIAL_FORM>>;
}> = ({ formData, setFormData }) => {
    const c = formData.contentJson as any;
    const setField = (key: string, value: any) =>
        setFormData(prev => ({
            ...prev,
            contentJson: { ...prev.contentJson, [key]: value }
        }));
    const inputCls = "w-full px-4 py-2 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy bg-white";
    const labelCls = "block text-xs font-bold text-gray-500 uppercase mb-1";

    return (
        <div className="space-y-6">
            <SectionCard title="1. Account / GL Identifiers">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Proposed GL Account Number</label>
                        <input className={inputCls} type="text" placeholder="e.g. 1000000000" value={c.glAccountNo || ''} onChange={e => setField('glAccountNo', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>GL Head Description / Name *</label>
                        <input className={inputCls} type="text" placeholder="e.g. Current Account - General" value={c.glAccountDesc || ''} onChange={e => setField('glAccountDesc', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Ownership Department *</label>
                        <input className={inputCls} type="text" placeholder="e.g. GAD / Accounts" value={c.glOwnershipDept || ''} onChange={e => setField('glOwnershipDept', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Operation End User</label>
                        <input className={inputCls} type="text" placeholder="e.g. Branch Staff / HO User" value={c.glOperationUser || ''} onChange={e => setField('glOperationUser', e.target.value)} />
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="2. Purpose & Technical Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Detailed Purpose for Activation *</label>
                        <ReactQuill theme="snow" value={c.glPurpose} onChange={(val) => setField('glPurpose', val)} modules={quillModules} placeholder="Describe why this GL Head is required..." />
                    </div>
                    <div>
                        <label className={labelCls}>Operation Type *</label>
                        <select className={inputCls} value={c.glOpType || 'System'} onChange={e => setField('glOpType', e.target.value)}>
                            <option value="System">System / Automatic</option>
                            <option value="Manual">Manual</option>
                            <option value="Both">Both</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Debit / Credit / Both *</label>
                        <select className={inputCls} value={c.glDrCrBoth || 'Both'} onChange={e => setField('glDrCrBoth', e.target.value)}>
                            <option value="Debit">Debit Only</option>
                            <option value="Credit">Credit Only</option>
                            <option value="Both">Both Dr/Cr Allowed</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Asset / Liability Class *</label>
                        <select className={inputCls} value={c.glAssetLiability || 'Liability'} onChange={e => setField('glAssetLiability', e.target.value)}>
                            <option value="Liability">Liability</option>
                            <option value="Asset">Asset</option>
                            <option value="Income">Income</option>
                            <option value="Expense">Expense</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Activity Type</label>
                        <input className={inputCls} type="text" placeholder="e.g. Generic / Special" value={c.glActivity || 'Generic'} onChange={e => setField('glActivity', e.target.value)} />
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="3. Controls & Mandates">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Limits Applicable?</label>
                        <select className={inputCls} value={c.glLimits || 'No'} onChange={e => setField('glLimits', e.target.value)}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Monitoring Department</label>
                        <input className={inputCls} type="text" placeholder="e.g. Inspecting / Audit" value={c.glMonitoringDept || ''} onChange={e => setField('glMonitoringDept', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Operation By *</label>
                        <select className={inputCls} value={c.glOperationBy || 'Branch only'} onChange={e => setField('glOperationBy', e.target.value)}>
                            <option value="Branch only">Branch only</option>
                            <option value="RO only">RO only</option>
                            <option value="Both">Both Branch & RO</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Cash Operation Allowed?</label>
                        <select className={inputCls} value={c.glCashOp || 'No'} onChange={e => setField('glCashOp', e.target.value)}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelCls}>Reconciliation Mandate</label>
                        <textarea className={inputCls} rows={2} value={c.glReconMandate || 'Reconciliation to zero by same day'} onChange={e => setField('glReconMandate', e.target.value)} />
                    </div>
                </div>
            </SectionCard>
        </div>
    );
};

// ─── Shared Components ──────────────────────────────────────────────────────────
const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="p-6 bg-bank-teal/5 rounded-2xl border border-bank-teal/20 space-y-4">
        <h4 className="text-bank-navy font-bold text-sm uppercase tracking-wider border-b border-bank-teal/20 pb-2">
            {title}
        </h4>
        {children}
    </div>
);

// ─── RBI Annex-I Proforma Form Component ─────────────────────────────────────
const RBIProformaForm: React.FC<{
    formData: typeof INITIAL_FORM;
    setFormData: React.Dispatch<React.SetStateAction<typeof INITIAL_FORM>>;
}> = ({ formData, setFormData }) => {
    const c = formData.contentJson;

    const setField = (key: string, value: any) =>
        setFormData(prev => ({
            ...prev,
            contentJson: { ...prev.contentJson, [key]: value }
        }));

    const setService = (key: string, value: any) =>
        setFormData(prev => ({
            ...prev,
            contentJson: {
                ...prev.contentJson,
                rbi_services: { ...(prev.contentJson.rbi_services as any), [key]: value }
            }
        }));

    const setSchedule = (day: string, slot: string, value: string) =>
        setFormData(prev => ({
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

const OfficeNoteManager: React.FC = () => {
    const { user: authUser } = useAuth();
    const [notes, setNotes] = useState<OfficeNote[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [selectedDept, setSelectedDept] = useState<string>('');
    const [initiators, setInitiators] = useState<any[]>([]);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [summaryConfig, setSummaryConfig] = useState({ period: 'weekly', date: format(new Date(), 'yyyy-MM-dd') });
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [previewNote, setPreviewNote] = useState<any>(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);


    const handleUploadScan = async (noteId: string, file: File) => {
        const formData = new FormData();
        formData.append('document', file);
        try {
            await api.post(`/office-notes/${noteId}/upload-scan`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Scanned signed copy uploaded successfully');
            fetchNotes();
        } catch (err) {
            alert('Failed to upload scanned copy: ' + getErrorMessage(err));
        }
    };

    const handleForwardToRO = async (noteId: string) => {
        if (!window.confirm('Are you sure you want to forward this note to the Regional Office? The branch should have uploaded a signed scanned copy before forwarding.')) return;
        try {
            await api.patch(`/office-notes/${noteId}/forward`);
            alert('Note successfully forwarded to Regional Office');
            fetchNotes();
        } catch (err) {
            alert('Failed to forward note: ' + getErrorMessage(err));
        }
    };

    const fetchNotes = () => {
        setLoading(true);
        api.get('/office-notes')
            .then((res: Record<string, any>) => {
                setNotes(res.data.data || res.data);
                setLoading(false);
            })
            .catch((err: unknown) => {
                alert(getErrorMessage(err));
                setLoading(false);
            });
    };

    const fetchDepartments = () => {
        api.get('/departments')
            .then((res: any) => setDepartments(res.data))
            .catch(err => console.error('Error fetching departments'));
    };

    const fetchInitiators = () => {
        api.get('/office-notes/initiators')
            .then((res: any) => setInitiators(res.data))
            .catch(err => console.error('Error fetching initiators'));
    };

    const handleGenerateSummary = async () => {
        try {
            const response = await api.get('/office-notes/high-value-dd/summary', {
                params: summaryConfig,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `HighValueDD_Summary_${summaryConfig.period}_${summaryConfig.date}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setShowSummaryModal(false);
        } catch (error) {
            alert(getErrorMessage(error));
        }
    };

    useEffect(() => {
        fetchNotes();
        fetchDepartments();
        fetchInitiators();
        const user = authUser || {} as any;
        if (user.department?.nameEn) {
            setSelectedDept(user.department.nameEn);
        }
        
        // Also set default preparer to current user if it's a new form
        if (!editingId && !formData.preparerId) {
            setFormData(prev => ({ ...prev, preparerId: user.id }));
        }
    }, []);

    // Suggest reference when department changes
    useEffect(() => {
        if (showForm) {
            if (selectedDept) {
                const isDeptChanged = !formData.deptName || formData.deptName !== selectedDept;
                
                // If it's a new note OR the department was changed in the dropdown during edit
                if (!editingId || isDeptChanged) {
                const noteDate = formData.contentJson.noteDate;
                api.get(`/office-notes/suggest-reference?deptName=${encodeURIComponent(selectedDept)}${noteDate ? `&date=${noteDate}` : ''}`)
                        .then((res: any) => {
                            setFormData(prev => ({ 
                                ...prev, 
                                referenceNo: res.data.referenceNo,
                                deptName: selectedDept
                            }));
                        })
                        .catch(err => console.error('Suggest reference error:', err));
                }
            } else {
                // If department is cleared, clear the reference and deptName in form
                setFormData(prev => ({ ...prev, referenceNo: '', deptName: '' }));
            }
        }
    }, [selectedDept, showForm, editingId, formData.contentJson.noteDate]);

    // Auto-lookup Branch Head Grade & Name when SOL ID changes
    useEffect(() => {
        const sol = formData.contentJson.branchSol;
        if (sol && sol.length === 4) {
            api.get(`/branches/code/${sol}`)
                .then((res: any) => {
                    const grade = res.data.headUser?.grade || 'Not found';
                    const branchName = res.data.nameEn || 'Not found';
                    setFormData(prev => ({
                        ...prev,
                        contentJson: { 
                            ...prev.contentJson, 
                            branchHeadGrade: grade,
                            issuingBranch: `${branchName} (${sol})`
                        }
                    }));
                })
                .catch(err => {
                    console.error('SOL Lookup Error:', err);
                    setFormData(prev => ({
                        ...prev,
                        contentJson: { ...prev.contentJson, branchHeadGrade: 'Error', issuingBranch: 'Error', ddDrawnOn: 'Error (Check SOL ID)' } // Added issuingBranch here
                    }));
                });
        }
    }, [formData.contentJson.branchSol]);

    // Auto-update subjects for High Value DD
    useEffect(() => {
        if (formData.type === 'HIGH_VALUE_DD') {
            const issuingBranch = formData.contentJson.issuingBranch || ''; // Changed from drawnOn to issuingBranch
            const txnId = formData.contentJson.transactionId || '';
            const applicant = formData.contentJson.applicantName || '';

            const titleEn = `${issuingBranch} - ${txnId} - ${applicant}`; // Changed from drawnOn to issuingBranch
            const titleHi = `${issuingBranch} - ${txnId} - ${applicant}`; // Changed from drawnOn to issuingBranch
            const titleTa = `${issuingBranch} - ${txnId} - ${applicant}`; // Changed from drawnOn to issuingBranch

            const currentCirculars = formData.contentJson.policyCirculars || [];
            const hasDefaults = currentCirculars.some(c => c.ref === '1/2011-12');
            
            if (formData.titleEn !== titleEn || formData.titleHi !== titleHi || formData.titleTa !== titleTa || !hasDefaults) {
                setFormData(prev => ({
                    ...prev,
                    titleEn,
                    titleHi,
                    titleTa,
                    contentJson: {
                        ...prev.contentJson,
                        policyCirculars: hasDefaults ? prev.contentJson.policyCirculars : [
                            { dept: 'Inter Branch Reconciliation Division', date: '2011-04-02', ref: '1/2011-12' },
                            { dept: 'Banking Operations', date: '2018-11-01', ref: 'Misc/452/2018-19' }
                        ]
                    }
                }));
            }
        }
    }, [formData.type, formData.contentJson.issuingBranch, formData.contentJson.transactionId, formData.contentJson.applicantName]); // Added issuingBranch to dependencies
    
    // Auto-sync Note Date and Date of Issue for High Value DD
    useEffect(() => {
        if (formData.type === 'HIGH_VALUE_DD' && formData.contentJson.noteDate) {
            if (formData.contentJson.dateOfIssue !== formData.contentJson.noteDate) {
                setFormData(prev => ({
                    ...prev,
                    contentJson: {
                        ...prev.contentJson,
                        dateOfIssue: prev.contentJson.noteDate
                    }
                }));
            }
        }
    }, [formData.type, formData.contentJson.noteDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const user = authUser || {} as any;
            // Ensure final deptName is synced if the suggest call hadn't finished or something
            const finalFormData = { ...formData, deptName: selectedDept || formData.deptName };

            // Use the selected preparerId from form, fallback to current user
            const effectivePreparerId = formData.preparerId || user.id || 'admin';

            if (editingId) {
                await api.put(`/office-notes/${editingId}`, {
                    ...finalFormData,
                    preparerId: effectivePreparerId
                });
            } else {
                await api.post('/office-notes', {
                    ...finalFormData,
                    preparerId: effectivePreparerId
                });
            }
            setShowForm(false);
            setEditingId(null);
            setFormData(INITIAL_FORM);
            fetchNotes();
        } catch (error) {
            alert(getErrorMessage(error));
        }
    };

    const handleEdit = (note: any) => {
        const content = typeof note.contentJson === 'string' ? JSON.parse(note.contentJson) : note.contentJson;
        
        // Use the department from the preparer as initial selectedDept for the dropdown
        const initialDept = note.preparer?.department?.nameEn || '';
        setSelectedDept(initialDept);

        setEditingId(note.id);
        setFormData({
            type: note.type,
            titleEn: note.titleEn,
            titleTa: content.titleTa || '',
            titleHi: content.titleHi || '',
            deptName: initialDept, // Update to something meaningful
            referenceNo: note.referenceNo || '',
            contentJson: content,
            preparerId: note.preparerId
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDuplicate = (note: any) => {
        const content = typeof note.contentJson === 'string' ? JSON.parse(note.contentJson) : note.contentJson;
        
        // Use the department from the preparer as initial selectedDept for the dropdown
        const initialDept = note.preparer?.department?.nameEn || selectedDept;
        setSelectedDept(initialDept);

        setEditingId(null); // New note
        setFormData({
            type: note.type,
            titleEn: `${note.titleEn} (Duplicate)`,
            titleTa: content.titleTa || note.titleTa || '',
            titleHi: content.titleHi || note.titleHi || '',
            deptName: initialDept,
            referenceNo: '', // Clear reference for new note
            contentJson: {
                ...content,
                noteDate: formatLocalISO(new Date()), // Set today as default
                isFrozen: false, // New note is not frozen
                transactionId: note.type === 'HIGH_VALUE_DD' ? '' : (content.transactionId || ''), // Clear txn ID for DD
            },
            preparerId: note.preparerId
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this office note? This will free up its reference number.')) return;
        try {
            await api.delete(`/office-notes/${id}`);
            fetchNotes();
        } catch (error) {
            alert(getErrorMessage(error));
        }
    };

    const handleDownloadPDF = async (id: string, title: string, noteDate?: string) => {
        try {
            const response = await api.get(`/office-notes/${id}/pdf`, {
                params: { manualDate: noteDate },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `OfficeNote_${title.replace(/\s+/g, '_')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert(getErrorMessage(error));
        }
    };

    const handlePreviewPDF = async (id: string, noteDate?: string) => {
        try {
            const response = await api.get(`/office-notes/${id}/pdf`, {
                params: { manualDate: noteDate },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            window.open(url, '_blank');
        } catch (error) {
            alert(getErrorMessage(error));
        }
    };

    const handleSaveSealPos = async (noteId: string, pos: { x: number, y: number }) => {
        try {
            const note = notes.find(n => n.id === noteId);
            if (!note) return;
            const content = typeof note.contentJson === 'string' ? JSON.parse(note.contentJson) : note.contentJson;
            
            await api.put(`/office-notes/${noteId}`, {
                ...note,
                contentJson: {
                    ...content,
                    sealX: pos.x,
                    sealY: pos.y
                }
            });
            
            fetchNotes();
            // Optional: Show a small toast
        } catch (err) {
            alert('Failed to save seal position: ' + getErrorMessage(err));
        }
    };

    const handleFreeze = async (id: string, title: string) => {
        if (!window.confirm(`Are you sure you want to FREEZE "${title}"? This will lock the document data and signatories permanently. No further changes in staff or settings will affect this PDF.`)) return;
        try {
            await api.patch(`/office-notes/${id}/freeze`);
            fetchNotes();
        } catch (error) {
            alert(getErrorMessage(error));
        }
    };

    const handleDownloadSelected = async () => {
        if (selectedIds.length === 0) return;
        
        for (const id of selectedIds) {
            const note = notes.find(n => n.id === id);
            if (note) {
                const content = JSON.parse(note.contentJson || '{}');
                await handleDownloadPDF(note.id, note.titleEn, content.noteDate);
                // Smaller delay to avoid browser blocking multiple downloads
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const selectAll = () => {
        if (selectedIds.length === notes.length) setSelectedIds([]);
        else setSelectedIds(notes.map(n => n.id));
    };

    return (
        <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold text-bank-navy tracking-tight">Office Note Generator</h2>
                    <p className="text-gray-500 font-medium mt-1">Full-blown vector document generation for Regional Office use cases</p>
                </div>
                <div className="flex items-center space-x-3">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleDownloadSelected}
                            className="flex items-center space-x-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg active:scale-95 animate-in fade-in slide-in-from-right-4"
                        >
                            <Download size={20} />
                            <span>Download {selectedIds.length} Selected</span>
                        </button>
                    )}
                    <button
                        onClick={() => setShowSummaryModal(true)}
                        className="flex items-center space-x-2 bg-white text-bank-navy border-2 border-bank-navy px-6 py-3 rounded-xl font-bold hover:bg-bank-navy hover:text-white transition-all shadow-md active:scale-95"
                    >
                        <FileSpreadsheet size={20} />
                        <span>Summary Report</span>
                    </button>
                    <button
                        onClick={() => {
                            setShowForm(!showForm);
                            if (showForm) {
                                setEditingId(null);
                                setFormData(INITIAL_FORM);
                            }
                        }}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${showForm ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-bank-teal text-white hover:bg-opacity-90 active:scale-95'
                            }`}
                    >
                        {showForm ? <Plus className="rotate-45 transition-transform" /> : <Plus />}
                        <span>{showForm ? 'Discard Draft' : 'Initiate New Note'}</span>
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="card p-10 bg-white border border-bank-teal/20 shadow-2xl rounded-2xl animate-in slide-in-from-top duration-500">
                    <div className="flex items-center space-x-3 mb-8 border-b pb-4">
                        <div className="p-3 bg-bank-navy text-white rounded-xl shadow-inner">
                            <LayoutDashboard size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-bank-navy">{editingId ? 'Edit Document' : 'Document Initiation Form'}</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Master Template: Trilingual Vector PDF</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Note Type</label>
                                <select
                                    className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy font-bold bg-gray-50/50"
                                    value={formData.type}
                                    onChange={(e) => {
                                        const newType = e.target.value;
                                        let updates: any = { type: newType };
                                        if (newType === 'MICR_CODE_REQUEST') {
                                            updates.titleEn = 'MICR CODE REQUEST';
                                        }
                                        setFormData({ ...formData, ...updates });
                                    }}
                                >
                                    <option value="CUSTOM">Custom Office Note</option>
                                    <option value="EXPENSE_APPROVAL">Expense Approval Note</option>
                                    <option value="HIGH_VALUE_DD">High Value DD Note</option>
                                    <optgroup label="Branch Network Management">
                                        <option value="PROFORMA_BRANCH_CODE">Proforma for Branch Code</option>
                                        <option value="RBI_BO_PROFORMA">RBI Annex-I — BO Reporting Proforma</option>
                                        <option value="MICR_CODE_REQUEST">MICR Code Request</option>
                                    </optgroup>
                                    <option value="DD_AUTHORIZATION">Demand Draft Authorization</option>
                                    <option value="VISIT_REPORT">Executive Visit Report</option>
                                    <option value="BROKEN_INTEREST">Broken Period Interest</option>
                                    <option value="REVERSAL_CHARGES">Reversal of Charges</option>
                                    <option value="GL_HEAD_ACTIVATION">GL Head Activation Request</option>
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Note Initiator</label>
                                <select
                                    className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy font-bold bg-bank-teal/5"
                                    value={formData.preparerId}
                                    onChange={(e) => setFormData({ ...formData, preparerId: e.target.value })}
                                >
                                    <option value="">Select Initiator</option>
                                    {initiators.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.fullNameEn} ({u.designationEn || 'Staff'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Note Date (Optional)</label>
                                <CustomDatePicker
                                    selected={parseLocalISO(formData.contentJson.noteDate)}
                                    onChange={(d: Date | null) => setFormData({ ...formData, contentJson: { ...formData.contentJson, noteDate: formatLocalISO(d) } })}
                                    className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy font-bold bg-gray-50/50"
                                />
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Department</label>
                                <select
                                    className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy font-bold bg-gray-50/50"
                                    value={selectedDept}
                                    onChange={(e) => setSelectedDept(e.target.value)}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((d: any) => (
                                        <option key={d.id} value={d.nameEn}>{d.nameEn}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    <Hash size={14} className="text-bank-teal" />
                                    <span>Reference Number</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy font-mono font-bold bg-bank-teal/5"
                                    placeholder="Enter or generated automatically"
                                    value={formData.referenceNo}
                                    onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                                />
                                <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter italic">Recommended: RO/DEPT/YYYY/MM/XX</p>
                            </div>
                            {formData.type !== 'MICR_CODE_REQUEST' && (
                                <div className="md:col-span-4 space-y-4 animate-in fade-in duration-300">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Subject (English)</label>
                                        <input
                                            type="text" required={formData.type !== 'RBI_BO_PROFORMA'}
                                            className={`w-full px-5 py-4 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all ${formData.type === 'HIGH_VALUE_DD' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                            placeholder="Clear, concise subject heading"
                                            value={formData.titleEn}
                                            onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                                            readOnly={formData.type === 'HIGH_VALUE_DD'}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 font-tamil">பொருள் (Tamil)</label>
                                            <input
                                                type="text"
                                                className={`w-full px-4 py-3 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all font-tamil text-sm ${formData.type === 'HIGH_VALUE_DD' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                                placeholder="அதிக மதிப்புள்ள கோரிக்கை வரைவோலை"
                                                value={formData.titleTa}
                                                onChange={(e) => setFormData({ ...formData, titleTa: e.target.value })}
                                                readOnly={formData.type === 'HIGH_VALUE_DD'}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 font-hindi">विषय (Hindi)</label>
                                            <input
                                                type="text"
                                                className={`w-full px-4 py-3 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all font-hindi text-sm ${formData.type === 'HIGH_VALUE_DD' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                                placeholder="उच्च मूल्य का डिमांड ड्राफ्ट"
                                                value={formData.titleHi}
                                                onChange={(e) => setFormData({ ...formData, titleHi: e.target.value })}
                                                readOnly={formData.type === 'HIGH_VALUE_DD'}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {formData.type === 'PROFORMA_BRANCH_CODE' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-bank-teal/5 rounded-2xl border border-bank-teal/20">
                                <div className="md:col-span-2">
                                    <h4 className="text-bank-navy font-bold text-sm uppercase tracking-wider border-b border-bank-teal/20 pb-2 mb-4">Branch Code Obtention Details</h4>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">1. Date of Opening</label>
                                    <input type="date" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.dateOfOpening} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, dateOfOpening: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">2. Name of Branch / Office</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.branchName} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, branchName: e.target.value } })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">3. Permission Letter / License Details</label>
                                    <textarea rows={2} className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.permissionDetails} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, permissionDetails: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">4. Population Category</label>
                                    <select className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.populationCategory} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, populationCategory: e.target.value } })}>
                                        <option value="METRO">Metro</option>
                                        <option value="URBAN">Urban</option>
                                        <option value="SEMI_URBAN">Semi Urban</option>
                                        <option value="RURAL">Rural</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">5. Population Centre</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.populationCentre} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, populationCentre: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">6. Community Development Block</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.communityBlock} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, communityBlock: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">7. Taluk / Tehsil</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.talukTehsil} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, talukTehsil: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">8. District and State</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.districtState} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, districtState: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">9. Working Hours</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.workingHours} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, workingHours: e.target.value } })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">10. Complete Postal Address with Pin Code</label>
                                    <textarea rows={2} className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.postalAddress} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, postalAddress: e.target.value } })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">11. Nearest Currency Chest</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        placeholder="Part I/II code, Bank Name, Distance in KM"
                                        value={formData.contentJson.currencyChest} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, currencyChest: e.target.value } })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">12. Authorised Dealer (FX Routing)</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        placeholder="Branch Name and Part I/II Code"
                                        value={formData.contentJson.authorisedDealer} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, authorisedDealer: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">13. Whether branch is under CBS</label>
                                    <select className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.underCBS} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, underCBS: e.target.value } })}>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">14. MICR Code</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.micrCode} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, micrCode: e.target.value } })} />
                                </div>
                            </div>
                        ) : formData.type === 'HIGH_VALUE_DD' ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-bank-teal/5 rounded-2xl border border-bank-teal/20">
                                <div className="md:col-span-3">
                                    <h4 className="text-bank-navy font-bold text-sm uppercase tracking-wider border-b border-bank-teal/20 pb-2 mb-4 flex items-center">
                                        <FileText className="mr-2 text-bank-teal" size={18} />
                                        High Value DD - Required Parameters
                                    </h4>
                                </div>

                                {/* Branch Information */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Branch SOL ID</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal font-mono font-bold" maxLength={4} placeholder="XXXX"
                                        value={formData.contentJson.branchSol} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, branchSol: e.target.value } })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Grade of Branch head (Auto)</label>
                                    <input type="text" readOnly className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-400 font-bold outline-none" 
                                        value={formData.contentJson.branchHeadGrade} placeholder="Auto-populated after SOL" />
                                </div>
                                
                                {/* Applicant Section */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name of the applicant</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-red-400" 
                                        value={formData.contentJson.applicantName} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, applicantName: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account number</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.applicantAccount} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, applicantAccount: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Compliance of KYC norms</label>
                                    <select className="w-full px-4 py-2 border rounded-lg outline-none focus:border-red-400 bg-white" 
                                        value={formData.contentJson.kycCompliance} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, kycCompliance: e.target.value } })}>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>

                                {/* Issue Details */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date of Issue</label>
                                    <CustomDatePicker
                                        selected={parseLocalISO(formData.contentJson.dateOfIssue)}
                                        onChange={(d: Date | null) => setFormData({ ...formData, contentJson: { ...formData.contentJson, dateOfIssue: formatLocalISO(d) } })}
                                        className="w-full px-4 py-2 border rounded-lg outline-none focus:border-red-400 font-bold text-bank-navy"
                                    />
                                </div>

                                {/* Beneficiary Section */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name of Beneficiary</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.beneficiaryName} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, beneficiaryName: e.target.value } })} />
                                </div>
                                
                                {/* Branch Fields */}
                                <div>
                                     <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Issuing Branch</label>
                                     <input
                                         type="text"
                                         className="w-full px-5 py-4 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy font-bold bg-gray-50/50 cursor-not-allowed"
                                         value={formData.contentJson.issuingBranch || ''}
                                         readOnly
                                     />
                                 </div>
                                 <div className="md:col-span-2">
                                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">DD Drawn on</label>
                                     <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-red-400" 
                                         placeholder="Enter payable branch name"
                                         value={formData.contentJson.ddDrawnOn} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, ddDrawnOn: e.target.value } })} />
                                 </div>

                                {/* DD Details */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount of DD (₹)</label>
                                    <input type="number" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-red-400" 
                                        value={formData.contentJson.amount} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, amount: e.target.value } })} />
                                </div>

                                {/* Transaction / Purpose */}
                                 <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Transaction ID</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-bank-teal" 
                                        value={formData.contentJson.transactionId} onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, transactionId: e.target.value } })} />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Purpose of transaction</label>
                                    <ReactQuill theme="snow" value={formData.contentJson.purpose} onChange={(val) => setFormData({ ...formData, contentJson: { ...formData.contentJson, purpose: val } })} modules={quillModules} placeholder="State the purpose clearly..." />
                                </div>

                                {/* Policy Circular References */}
                                <div className="md:col-span-3 mt-4">
                                    <div className="flex items-center justify-between mb-4 border-b border-bank-teal/20 pb-2">
                                        <h4 className="text-bank-navy font-bold text-sm uppercase tracking-wider flex items-center">
                                            <Hash className="mr-2 text-bank-teal" size={16} />
                                            Policy Circular References
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newCirculars = [...(formData.contentJson.policyCirculars || [])];
                                                newCirculars.push({ dept: '', date: '', ref: '' });
                                                setFormData({ ...formData, contentJson: { ...formData.contentJson, policyCirculars: newCirculars } });
                                            }}
                                            className="flex items-center space-x-1 px-3 py-1 bg-bank-teal text-white rounded hover:bg-opacity-90 transition-all text-[10px] font-bold uppercase"
                                        >
                                            <Plus size={12} />
                                            <span>Add Circular</span>
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {(formData.contentJson.policyCirculars || []).map((circular: any, index: number) => (
                                            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-white rounded-xl border border-bank-teal/10 relative group">
                                                {index > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newCirculars = [...formData.contentJson.policyCirculars];
                                                            newCirculars.splice(index, 1);
                                                            setFormData({ ...formData, contentJson: { ...formData.contentJson, policyCirculars: newCirculars } });
                                                        }}
                                                        className="absolute -right-2 -top-2 p-1 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-all opacity-0 group-hover:opacity-100 border border-red-100"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Issuing Department</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-3 py-2 border rounded-lg outline-none focus:border-bank-teal text-xs"
                                                        placeholder="e.g. Central Office, GAD"
                                                        value={circular.dept}
                                                        onChange={(e) => {
                                                            const newCirculars = [...formData.contentJson.policyCirculars];
                                                            newCirculars[index].dept = e.target.value;
                                                            setFormData({ ...formData, contentJson: { ...formData.contentJson, policyCirculars: newCirculars } });
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Circular Date</label>
                                                    <CustomDatePicker
                                                        selected={parseLocalISO(circular.date)}
                                                        onChange={(d: Date | null) => {
                                                            const newCirculars = [...formData.contentJson.policyCirculars];
                                                            newCirculars[index].date = formatLocalISO(d);
                                                            setFormData({ ...formData, contentJson: { ...formData.contentJson, policyCirculars: newCirculars } });
                                                        }}
                                                        className="w-full px-3 py-2 border rounded-lg outline-none focus:border-bank-teal text-xs font-bold"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Circular Reference</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-3 py-2 border rounded-lg outline-none focus:border-bank-teal text-xs"
                                                        placeholder="e.g. 1/2023-24"
                                                        value={circular.ref}
                                                        onChange={(e) => {
                                                            const newCirculars = [...formData.contentJson.policyCirculars];
                                                            newCirculars[index].ref = e.target.value;
                                                            setFormData({ ...formData, contentJson: { ...formData.contentJson, policyCirculars: newCirculars } });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : formData.type === 'RBI_BO_PROFORMA' ? (
                            <RBIProformaForm formData={formData} setFormData={setFormData} />
                        ) : formData.type === 'MICR_CODE_REQUEST' ? (
                            <MICRRequestForm formData={formData} setFormData={setFormData} />
                        ) : formData.type === 'EXPENSE_APPROVAL' ? (
                            <ExpenseApprovalForm formData={formData} setFormData={setFormData} />
                        ) : formData.type === 'BROKEN_INTEREST' ? (
                            <BrokenPeriodInterestForm formData={formData} setFormData={setFormData} />
                        ) : formData.type === 'REVERSAL_CHARGES' ? (
                            <ReversalChargesForm formData={formData} setFormData={setFormData} />
                        ) : formData.type === 'GL_HEAD_ACTIVATION' ? (
                            <GLHeadActivationForm formData={formData} setFormData={setFormData} />
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center space-x-4 p-1 bg-gray-100/50 rounded-xl w-fit">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, contentJson: { ...formData.contentJson, scope: 'BRANCH' } })}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${formData.contentJson.scope !== 'REGION' ? 'bg-white shadow-sm text-bank-teal' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Branch Scope
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, contentJson: { ...formData.contentJson, scope: 'REGION' } })}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${formData.contentJson.scope === 'REGION' ? 'bg-white shadow-sm text-bank-teal' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Regional Scope
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
                                    <div>
                                        <label className="flex items-center space-x-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                            <IndianRupee size={14} className="text-bank-teal" />
                                            <span>Financial Amount (₹) <span className="text-[10px] lowercase font-normal opacity-70">(if any)</span></span>
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full px-5 py-3 border-2 border-white rounded-xl outline-none focus:border-bank-teal transition-all shadow-sm"
                                            placeholder="Enter amount if applicable"
                                            value={formData.contentJson.amount}
                                            onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, amount: e.target.value } })}
                                        />
                                    </div>
                                    <div>
                                        {formData.contentJson.scope === 'REGION' ? (
                                            <>
                                                <label className="flex items-center space-x-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                                    <Layers size={14} className="text-bank-teal" />
                                                    <span>Target Region</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-5 py-3 border-2 border-white rounded-xl outline-none focus:border-bank-teal transition-all shadow-sm"
                                                    placeholder="e.g. Dindigul Region"
                                                    value={formData.contentJson.regionName || 'Dindigul Region'}
                                                    onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, regionName: e.target.value } })}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <label className="flex items-center space-x-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                                    <Building2 size={14} className="text-bank-teal" />
                                                    <span>Unit / Branch Name</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-5 py-3 border-2 border-white rounded-xl outline-none focus:border-bank-teal transition-all shadow-sm"
                                                    placeholder="Target Branch/Office"
                                                    value={formData.contentJson.branch}
                                                    onChange={(e) => setFormData({ ...formData, contentJson: { ...formData.contentJson, branch: e.target.value } })}
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {formData.type !== 'RBI_BO_PROFORMA' && formData.type !== 'MICR_CODE_REQUEST' && formData.type !== 'HIGH_VALUE_DD' && formData.type !== 'EXPENSE_APPROVAL' && formData.type !== 'BROKEN_INTEREST' && formData.type !== 'REVERSAL_CHARGES' && formData.type !== 'GL_HEAD_ACTIVATION' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Detailed Narrative / Proposal</label>
                                <ReactQuill
                                    theme="snow"
                                    value={formData.contentJson.details}
                                    onChange={(val) => setFormData({ ...formData, contentJson: { ...formData.contentJson, details: val } })}
                                    modules={quillModules}
                                    placeholder="Structure your note clearly with background, facts, and recommendation..."
                                />
                            </div>
                        )}
                        <style>{quillStyle}</style>

                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Justification & Policy Reference</label>
                                <ReactQuill 
                                    theme="snow" 
                                    value={formData.contentJson.justification} 
                                    onChange={(val) => setFormData({ ...formData, contentJson: { ...formData.contentJson, justification: val } })} 
                                    modules={quillModules} 
                                    placeholder="Circular reference or specific policy quote..." 
                                />
                            </div>

                        <div className="flex justify-end pt-6 border-t">
                            <button
                                type="submit"
                                className="bg-bank-navy text-white px-12 py-4 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 transition-all flex items-center space-x-3"
                            >
                                <FileText size={20} />
                                <span>{editingId ? 'Update & Finalize Vector PDF' : 'Commit & Generate Vector PDF'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-bank-teal"></div>
                    <p className="text-gray-400 font-bold animate-pulse">Establishing secure document connection...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {notes.length > 0 ? (
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200 mb-2">
                           <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-bank-teal focus:ring-bank-teal cursor-pointer"
                                    checked={selectedIds.length === notes.length && notes.length > 0}
                                    onChange={selectAll} />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-bank-navy transition-colors">Select All Documents ({notes.length})</span>
                           </label>
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter italic">Optimized View: Tight Height & Metadata</span>
                        </div>
                    ) : null}
                    {notes.length > 0 ? (
                        notes.map((note: OfficeNote) => (
                            <div key={note.id} className={`group card p-4 bg-white hover:border-bank-teal shadow-sm hover:shadow-lg transition-all border-2 relative overflow-hidden ${selectedIds.includes(note.id) ? 'border-bank-teal bg-bank-teal/[0.02]' : 'border-transparent'}`}>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-full -mr-12 -mt-12 group-hover:bg-bank-teal/5 transition-colors"></div>

                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center space-x-4">
                                        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-bank-teal focus:ring-bank-teal cursor-pointer z-20"
                                            checked={selectedIds.includes(note.id)}
                                            onChange={() => toggleSelect(note.id)} />
                                        <div className="p-3 rounded-xl bg-bank-navy/5 text-bank-navy group-hover:bg-bank-navy group-hover:text-white transition-all">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-3">
                                                <h3 className="text-lg font-bold text-bank-navy leading-tight">{note.titleEn}</h3>
                                                {(() => {
                                                    const content = JSON.parse(note.contentJson || '{}');
                                                    return content.isFrozen ? (
                                                        <span className="bg-amber-100 text-amber-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm border border-amber-200 flex items-center space-x-1">
                                                            <Lock size={10} />
                                                            <span>Frozen</span>
                                                        </span>
                                                    ) : (
                                                                <span className="bg-bank-teal/10 text-bank-teal text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm border border-bank-teal/20">
                                                                    {note.type.replace(/_/g, ' ')}
                                                                </span>
                                                            );
                                                        })()}
                                                        {note.status === 'FORWARDED_TO_RO' && (
                                                            <span className="bg-indigo-100 text-indigo-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm border border-indigo-200 flex items-center space-x-1">
                                                                <Clock size={10} />
                                                                <span>Forwarded to RO</span>
                                                            </span>
                                                        )}
                                                        {note.scannedCopyUrl && (
                                                            <span className="bg-green-100 text-green-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm border border-green-200">
                                                                Signed Copy Attached
                                                            </span>
                                                        )}
                                                    </div>
                                            <div className="flex items-center space-x-4 text-[11px] text-gray-400 font-medium mt-1">
                                                <span className="flex items-center space-x-1.5"><User size={12} className="text-bank-teal" /> <span>{note.preparer?.fullNameEn || 'System Admin'}</span></span>
                                                <span className="text-gray-200">|</span>
                                                {(() => {
                                                    const content = JSON.parse(note.contentJson || '{}');
                                                    const displayDate = content.noteDate ? parseLocalISO(content.noteDate) : new Date(note.createdAt);
                                                    return (
                                                        <span className="flex items-center space-x-1.5">
                                                            {content.noteDate ? <Calendar size={12} className="text-bank-teal" /> : <Clock size={12} className="text-bank-teal" />}
                                                            <span>{format(displayDate || new Date(), content.noteDate ? 'do MMMM yyyy' : 'do MMMM yyyy, HH:mm')}</span>
                                                        </span>
                                                    );
                                                })()}
                                                <span className="text-gray-200">|</span>
                                                <span className="font-mono text-[9px] text-gray-400 font-bold uppercase">REF: {note.referenceNo || 'PENDING'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => {
                                                const content = JSON.parse(note.contentJson || '{}');
                                                handleDownloadPDF(note.id, note.titleEn, content.noteDate);
                                            }}
                                            className="flex items-center space-x-2 bg-bank-navy text-white px-4 py-1.5 rounded-xl font-semibold hover:bg-bank-navy/90 hover:shadow-bank-navy/20 transition-all shadow-md active:scale-95 group"
                                        >
                                            <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                                            <span className="text-xs">Vector PDF</span>
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setPreviewNote(note);
                                                setShowPreviewModal(true);
                                            }}
                                            className="p-2 text-bank-teal hover:bg-bank-teal/5 rounded-lg transition-all tooltip bg-bank-teal/5"
                                            title="Interactive Preview & Seal Adjustment"
                                        >
                                            <div className="flex items-center space-x-1">
                                                <Eye size={20} />
                                                <Award size={14} className="animate-bounce" />
                                            </div>
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const content = JSON.parse(note.contentJson || '{}');
                                                handlePreviewPDF(note.id, content.noteDate);
                                            }}
                                            className="p-2 text-gray-300 hover:text-bank-navy hover:bg-gray-100 rounded-lg transition-all tooltip"
                                            title="View Native PDF"
                                        >
                                            <FileText size={20} />
                                        </button>
                                        
                                        {/* Workflow Actions */}
                                        {note.status !== 'APPROVED' && note.status !== 'FORWARDED_TO_RO' && (
                                            <>
                                                <div className="h-6 w-[1px] bg-gray-100 mx-1"></div>
                                                <div className="flex items-center space-x-1">
                                                    <label className="p-2 text-gray-300 hover:text-bank-teal hover:bg-bank-teal/5 rounded-lg transition-all cursor-pointer tooltip" title="Upload Signed Copy">
                                                        <Plus size={18} />
                                                        <input 
                                                            type="file" 
                                                            className="hidden" 
                                                            accept=".pdf,image/*" 
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleUploadScan(note.id, file);
                                                            }} 
                                                        />
                                                    </label>
                                                    {note.scannedCopyUrl && (
                                                        <button 
                                                            onClick={() => handleForwardToRO(note.id)}
                                                            className="flex items-center space-x-1 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm"
                                                            title="Forward to Regional Office"
                                                        >
                                                            <span>Forward to RO</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        {note.scannedCopyUrl && (
                                            <a 
                                                href={`${api.defaults.baseURL}${note.scannedCopyUrl}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-all"
                                                title="View Scanned Signed Copy"
                                            >
                                                <FileText size={18} />
                                            </a>
                                        )}

                                        <div className="h-6 w-[1px] bg-gray-100 mx-1"></div>
                                        {(() => {
                                            const content = JSON.parse(note.contentJson || '{}');
                                            const isFrozen = content.isFrozen;
                                            return (
                                                <>
                                                    {!isFrozen && (
                                                        <button 
                                                            onClick={() => handleFreeze(note.id, note.titleEn)}
                                                            className="p-2 text-gray-300 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                            title="Freeze Document"
                                                        >
                                                            <Unlock size={18} />
                                                        </button>
                                                    )}
                                                    {isFrozen && (
                                                        <div className="p-2 text-amber-500" title="Document Locked">
                                                            <Lock size={18} />
                                                        </div>
                                                    )}
                                                    <button 
                                                        onClick={() => handleDuplicate(note)}
                                                        className="p-2 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all tooltip"
                                                        title="Duplicate Document"
                                                    >
                                                        <Copy size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleEdit(note)}
                                                        disabled={isFrozen}
                                                        className={`p-2 rounded-lg transition-all ${isFrozen ? 'text-gray-100 cursor-not-allowed' : 'text-gray-300 hover:text-bank-teal hover:bg-bank-teal/5'}`}
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(note.id)}
                                                        disabled={isFrozen}
                                                        className={`p-2 rounded-lg transition-all ${isFrozen ? 'text-gray-100 cursor-not-allowed' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-24 card border-dashed border-4 border-gray-100 bg-gray-50/50 rounded-3xl">
                            <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-2 border-gray-100">
                                <FileText className="text-gray-300" size={48} />
                            </div>
                            <h4 className="text-2xl font-bold text-gray-500">Regional Document Vault Empty</h4>
                            <p className="text-gray-400 max-w-sm mx-auto mt-2">The system is ready to generate official trilingual vector correspondence. Initiate your first office note above.</p>
                        </div>
                    )}
                </div>
            )}
            {showSummaryModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bank-navy/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-bank-navy p-6 flex justify-between items-center text-white">
                            <div className="flex items-center space-x-3">
                                <FileSpreadsheet className="text-bank-teal" />
                                <h3 className="text-xl font-bold">Generate Transaction Summary</h3>
                            </div>
                            <button onClick={() => setShowSummaryModal(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <p className="text-gray-500 text-sm font-medium">Generate a detailed summary of High Value DD transactions in CSV format.</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Report Period</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['weekly', 'monthly'].map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => setSummaryConfig({ ...summaryConfig, period: p })}
                                                className={`py-3 rounded-xl font-bold border-2 transition-all capitalize ${
                                                    summaryConfig.period === p 
                                                    ? 'border-bank-teal bg-bank-teal/5 text-bank-teal' 
                                                    : 'border-gray-100 text-gray-400 hover:border-gray-200'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Reference Date</label>
                                    <CustomDatePicker
                                        selected={parseLocalISO(summaryConfig.date)}
                                        onChange={(d: Date | null) => setSummaryConfig({ ...summaryConfig, date: formatLocalISO(d) })}
                                        className="w-full px-5 py-3 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all font-bold text-bank-navy bg-white shadow-sm hover:shadow-md transition-shadow"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-2 italic px-1">
                                        * Report will cover the week/month containing this date.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={handleGenerateSummary}
                                    className="w-full bg-bank-navy text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center space-x-2"
                                >
                                    <Download size={20} />
                                    <span>Download CSV Summary</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPreviewModal && previewNote && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-bank-navy/80 backdrop-blur-md p-8 overflow-y-auto">
                    <div className="w-full max-w-5xl h-full flex flex-col">
                        <div className="flex justify-end mb-4">
                            <button 
                                onClick={() => setShowPreviewModal(false)}
                                className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-all shadow-xl"
                            >
                                <X size={32} />
                            </button>
                        </div>
                        {(() => {
                            const content = typeof previewNote.contentJson === 'string' ? JSON.parse(previewNote.contentJson) : previewNote.contentJson;
                            const user = authUser || {} as any;
                            const org = user.organization || {
                                bankNameEn: GLOBAL_CONFIG.bankName,
                                bankNameHi: GLOBAL_CONFIG.bankNameHi,
                                bankNameTa: GLOBAL_CONFIG.bankNameTa,
                                officeNameEn: REGIONAL_OFFICE_DATA.name.toUpperCase(),
                                officeNameHi: REGIONAL_OFFICE_DATA.nameHi,
                                officeNameTa: REGIONAL_OFFICE_DATA.nameTa,
                                addressEn: REGIONAL_OFFICE_DATA.address,
                                deptSealUrl: '/assets/dept_seal.png',
                                signingAuthEn: REGIONAL_OFFICE_DATA.signingAuthEn,
                                signingAuthHi: REGIONAL_OFFICE_DATA.signingAuthHi,
                                signingAuthTa: REGIONAL_OFFICE_DATA.signingAuthTa
                            };

                            const signatories = (content.signatories || []).map((sig: any) => ({
                                name: sig.label,
                                titleEn: sig.title || sig.role || 'Staff',
                                nameHi: sig.nameHi,
                                nameTa: sig.nameTa,
                                titleHi: sig.titleHi,
                                titleTa: sig.titleTa
                            }));
                            
                            // RESOLVE DEPARTMENT SEAL
                            let sealPath = org.deptSealUrl || '/assets/dept_seal.png';
                            if (previewNote.preparer?.department?.sealPath) {
                                const sp = previewNote.preparer.department.sealPath;
                                sealPath = sp.startsWith('assets') ? `/${sp}` : sp;
                            } else if ((user as any).department?.sealPath) {
                                const sp = (user as any).department.sealPath;
                                sealPath = sp.startsWith('assets') ? `/${sp}` : sp;
                            }

                            const initiator = previewNote.preparer ? {
                                name: previewNote.preparer.fullNameEn,
                                nameTa: previewNote.preparer.fullNameTa,
                                nameHi: previewNote.preparer.fullNameHi,
                                titleEn: previewNote.preparer.designationEn || 'Initiator',
                                titleHi: previewNote.preparer.designationHi,
                                titleTa: previewNote.preparer.designationTa
                            } : {
                                name: user.fullNameEn || 'System User',
                                titleEn: 'Initiator'
                            };

                            const reviewers = signatories.length > 0 ? signatories.slice(0, -1) : [];
                            const finalApprover = signatories.length > 0 ? signatories[signatories.length - 1] : {
                                name: org.signatoryName || 'Regional Manager',
                                titleEn: org.signingAuthEn || 'Approving Authority',
                                nameTa: org.signatoryNameTa,
                                nameHi: org.signatoryNameHi,
                                titleHi: org.signingAuthHi,
                                titleTa: org.signingAuthTa
                            };

                            return (
                                <DocumentPreview
                                    title={previewNote.titleEn}
                                    titleHi={previewNote.titleHi || content.titleHi}
                                    titleTa={previewNote.titleTa || content.titleTa}
                                    refNo={previewNote.referenceNo}
                                    date={content.noteDate}
                                    bodyHtml={content.details || content.purpose || ''}
                                    initiator={initiator}
                                    reviewers={reviewers}
                                    approver={finalApprover}
                                    organization={org}
                                    deptSealSrc={sealPath}
                                    initialSealPos={content.sealX !== undefined ? { x: content.sealX, y: content.sealY } : undefined}
                                    onSaveSealPos={(pos) => handleSaveSealPos(previewNote.id, pos)}
                                />
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfficeNoteManager;
