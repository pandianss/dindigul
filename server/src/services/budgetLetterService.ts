import prisma from '../lib/prisma';
import { getRegionalOfficeData, imageToBase64 } from './pdfService';
import { generateReference } from './referenceService';
// No external imports needed for words anymore

export type AllotmentStrategy = 'SIZE_BASED' | 'POPULATION_BASED' | 'UPLOAD_BASED';

export interface BudgetAllotmentConfig {
    budgetType: string;
    strategy: AllotmentStrategy;
    financialYear: string;
    emailDate: string;
    amounts: Record<string, number>;
    customAllotments?: Record<string, number>;
    customIntro?: string;
    customOutro?: string;
    specificDirective?: string;
}

export const budgetLetterService = {
    /**
     * Generates budget allotment letters for any budget category using various strategies
     */
    async generateBudgetAllotments(config: BudgetAllotmentConfig) {
        const { 
            budgetType, 
            strategy, 
            financialYear, 
            emailDate, 
            amounts, 
            customAllotments,
            customIntro,
            customOutro,
            specificDirective
        } = config;
 
        const branches = await prisma.branch.findMany({
            where: { 
                type: { notIn: ['REGIONAL OFFICE', 'LPC'] }
            },
            orderBy: {
                code: 'asc'
            }
        });
 
        // 1. Purge existing DRAFTS for this budget type and period to prevent duplicates
        try {
            const deleteResult = await prisma.letter.deleteMany({
                where: {
                    type: 'BUDGET_ALLOTMENT',
                    status: 'DRAFT',
                    period: financialYear,
                    titleEn: { contains: budgetType }
                }
            });
            console.log(`[BudgetPurge] Deleted ${deleteResult.count} old drafts for ${budgetType} (${financialYear})`);
        } catch (e) {
            console.error('[BudgetPurge] Error during cleanup:', e);
        }
 
        const orgMeta = await getRegionalOfficeData();
        
        // Dynamic Signatory Lookup: Find the Planning Department Head or senior-most Planning user
        const signatory = await prisma.user.findFirst({
            where: { 
                OR: [
                    { section: { contains: 'Planning', mode: 'insensitive' }, role: 'ADMIN' },
                    { fullNameEn: { contains: 'Annamalai', mode: 'insensitive' } } // Retain as specific secondary fallback
                ]
            },
            include: { designation: true }
        });
 
        // Apply Dynamic Signatory Overrides
        if (signatory) {
            orgMeta.signatoryName = signatory.fullNameEn;
            orgMeta.signatoryNameHi = signatory.fullNameHi || "अन्नामलाई";
            orgMeta.signatoryNameTa = signatory.fullNameTa || "அண்ணாமலை";
            orgMeta.signingAuthEn = signatory.designationEn || (signatory as any).designation?.nameEn || "Chief Manager";
            orgMeta.signingAuthHi = signatory.designationHi || (signatory as any).designation?.nameHi || "मुख्य प्रबंधक";
            orgMeta.signingAuthTa = signatory.designationTa || (signatory as any).designation?.nameTa || "முதன்மை மேலாளர்";
        } else {
            // Static fallback if no matching user found
            orgMeta.signatoryName = "Chief Manager";
            orgMeta.signatoryNameHi = "मुख्य प्रबंधक";
            orgMeta.signatoryNameTa = "முதன்மை மேலாளர்";
            orgMeta.signingAuthEn = "Planning Department";
            orgMeta.signingAuthHi = "योजना विभाग";
            orgMeta.signingAuthTa = "திட்டமிடல் துறை";
        }
        
        // Inject Department Seal
        (orgMeta as any).deptSealSrc = imageToBase64('assets/Planning Seal.svg');
        const results = { created: 0, skipped: 0, details: [] as any[] };

        const normalizedAmounts: Record<string, number> = {};
        for (const [key, value] of Object.entries(amounts)) {
            normalizedAmounts[key.toUpperCase().replace(/[\s\-_]+/g, '')] = value;
        }

        for (const branch of branches) {
            let amount = 0;
            const branchSize = (branch.size || '').toUpperCase().replace(/[\s\-_]+/g, '');
            const branchPop = (branch.populationGroup || '').toUpperCase().replace(/[\s\-_]+/g, '');

            if (strategy === 'SIZE_BASED') {
                amount = normalizedAmounts[branchSize] || 0;
            } else if (strategy === 'POPULATION_BASED') {
                amount = normalizedAmounts[branchPop] || 0;
            } else if (strategy === 'UPLOAD_BASED' && customAllotments) {
                amount = customAllotments[branch.code] || 0;
            }

            if (amount <= 0) {
                results.skipped++;
                results.details.push({
                    branch: `${branch.nameEn} [${branch.code}]`,
                    param: budgetType,
                    type: 'BUDGET_ALLOTMENT',
                    reason: `No amount defined for strategy ${strategy} (Size: ${branch.size || 'N/A'}, Pop: ${branch.populationGroup || 'N/A'})`
                });
                continue;
            }

            const titleEn = `Allotment of Budget for ${budgetType} - FY ${financialYear}`;
            const referenceNo = await generateReference('LETTER', 'Planning Department');
            
            const intro = customIntro || `The budget provision for <b>${budgetType}</b> for your branch has been approved for the financial year <b>${financialYear}</b>.`;
            const directive = specificDirective
                ? ` ${specificDirective}`
                : ` The allotment is issued in terms of the instructions communicated by the Banking Operations Department vide email dated <b>${emailDate}</b>.`;
            const allocationBasis = strategy !== 'UPLOAD_BASED'
                ? `Based on the classification of your branch under the category <b>${strategy === 'SIZE_BASED' ? branch.size : branch.populationGroup} Branch</b>, the following allocation is sanctioned for utilisation during the year.`
                : 'The following allocation is sanctioned for utilisation during the year.';
            const closing = customOutro || `The branch may ensure that the amount is utilised judiciously for the approved purpose only, strictly in accordance with the extant instructions of the Bank. Expenditure should be phased appropriately across the year, supported by proper vouchers and approvals, and kept within the sanctioned ceiling. No enhancement over and above the allotted amount will ordinarily be considered.`;

            let contentEn = `${intro}${directive}

${allocationBasis}

<b>Budget Head:</b> ${budgetType}
<b>Amount Allotted:</b> Rs. ${amount.toLocaleString('en-IN')}/- (Rupees ${this.numberToEnglish(amount)} only)

${closing}

This allotment shall remain valid for the current financial year and is subject to audit scrutiny and post-facto verification wherever applicable.`;

            if (budgetType.toLowerCase().includes('sundry') || budgetType.toLowerCase().includes('others')) {
                const redNote = `<div style="color: #dc2626; font-weight: bold; border: 1px solid #fee2e2; padding: 4px 10px; border-radius: 8px; background-color: #fef2f2; font-size: 11px; margin-top: 4px;">
                    Note: Branches must keep their other sundries expenses within the prescribed budget and expenses for stationery items, supply of manpower, vehicle fare, repair/service charges for office equipment, furniture & fixtures should not be debited from Sundry Other Charges Head (XXXX0154066001).
                </div>`;
                contentEn += redNote;
            }

            await prisma.letter.create({
                data: {
                    type: 'BUDGET_ALLOTMENT',
                    status: 'DRAFT',
                    titleEn,
                    contentEn,
                    branchId: branch.id,
                    period: financialYear,
                    referenceNo,
                    orgMeta,
                    valueAtTime: amount,
                    version: 1
                }
            });

            results.created++;
        }

        return results;
    },

    numberToEnglish(n: number): string {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + this.numberToEnglish(n % 100) : '');
        if (n < 100000) return this.numberToEnglish(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + this.numberToEnglish(n % 1000) : '');
        if (n < 10000000) return this.numberToEnglish(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + this.numberToEnglish(n % 100000) : '');
        
        return n.toString();
    }
};
