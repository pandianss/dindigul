import React from 'react';
import ReactQuill from 'react-quill-new';
import { SectionCard } from './SectionCard';
import { calcInterestBI } from '../utils';
import { quillModules } from '../constants';

interface Props {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const BrokenPeriodInterestForm: React.FC<Props> = ({ formData, setFormData }) => {
    const c = formData.contentJson as any;
    const setField = (key: string, value: any) =>
        setFormData((prev: any) => ({
            ...prev,
            contentJson: { ...prev.contentJson, [key]: value }
        }));
    const inputCls = "w-full px-4 py-2 border-2 border-gray-100 rounded-xl outline-none focus:border-bank-teal transition-all text-bank-navy bg-white";
    const labelCls = "block text-xs font-bold text-gray-500 uppercase mb-1";
    
    const handleCategoryChange = (val: string) => {
        let spread = '0';
        if (val === 'Senior Citizen') spread = '0.50';
        if (val === 'Super Senior Citizen') spread = '0.75';
        setFormData((prev: any) => {
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
        setFormData((prev: any) => {
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
        setFormData((prev: any) => {
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
        setFormData((prev: any) => {
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
        setFormData((prev: any) => {
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
        setFormData((prev: any) => {
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
        setFormData((prev: any) => {
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
            : `= ₹${Number(c.principalAmount).toLocaleString('en-IN')} × (1 + ${c.effectiveInterestRate}%÷${{ QUARTERLY:4, MONTHLY:12, HALFYEARLY:2, ANNUALLY:1 }[freq as keyof typeof freqLabel] || 1})^(${{ QUARTERLY:4, MONTHLY:12, HALFYEARLY:2, ANNUALLY:1 }[freq as keyof typeof freqLabel] || 1}×${(parseFloat(String(c.brokenPeriodDays))/365).toFixed(4)}y) − P`
    ) : null;

    return (
        <div className="space-y-6">
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
