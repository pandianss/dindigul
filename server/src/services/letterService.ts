import prisma from '../lib/prisma';
import { createNotification } from './notificationService';
import { getPaginatedResponse } from '../utils/pagination';
import { buildLetterBodyHtml, buildPremiumLayout, generatePDF, getRegionalOfficeData, imageToBase64 } from './pdfService';
import { format } from 'date-fns';
import { generateReference } from './referenceService';

const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
};

const resolveLetterDate = (letter: any, org: any) => {
    const explicitDate = org?.letterDate || org?.businessDate;
    if (typeof explicitDate === 'string' && explicitDate.trim()) {
        const trimmed = explicitDate.trim();
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) return trimmed;
        const parsed = new Date(trimmed);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString('en-IN', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            }).replace(/\//g, '.');
        }
    }

    if (letter.type === 'OP_RISK' && typeof letter.period === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(letter.period.trim())) {
        return letter.period.trim();
    }

    return new Date(letter.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    }).replace(/\//g, '.');
};

export const letterService = {
    async getLetters(user: any, branchId: any, type: any, skip: number, take: number, page: number, limit: number) {
        const scopedBranchId = user?.role === 'BRANCH_USER'
            ? user.branchId
            : (branchId ? String(branchId) : undefined);
        const whereClause = {
            ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
            ...(type ? { type: String(type) } : {})
        };

        const [letters, total] = await Promise.all([
            prisma.letter.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                include: {
                    branch: {
                        include: {
                            headUser: {
                                include: {
                                    designation: true
                                }
                            }
                        }
                    },
                    signatory: {
                        include: { designation: true }
                    },
                    author: {
                        include: { designation: true }
                    }
                },
                skip,
                take
            }),
            prisma.letter.count({ where: whereClause })
        ]);

        const regionHead = await prisma.user.findFirst({
            where: { isRegionHead: true },
            include: { designation: true }
        });

        const RO_DATA = await getRegionalOfficeData();

        let config = await prisma.organizationConfig.findUnique({
            where: { id: 'singleton' }
        });

        if (!config) {
            config = await prisma.organizationConfig.create({
                data: {
                    id: 'singleton',
                    bankNameEn: RO_DATA.bankNameEn,
                    bankNameTa: RO_DATA.bankNameTa,
                    bankNameHi: RO_DATA.bankNameHi,
                    signingAuthEn: "Regional Manager",
                    signingAuthTa: "மண்டல மேலாளர்",
                    signingAuthHi: "क्षेत्रीय प्रबंधक"
                }
            });
        }

        const organization = {
            ...config,
            ...RO_DATA
        };

        const metadata = {
            regionHeadName: regionHead ? toTitleCase(regionHead.fullNameEn) : "Regional Manager",
            regionHeadDesignation: regionHead?.designation?.nameEn
                ? toTitleCase(regionHead.designation.nameEn)
                : "Regional Manager",
            organization
        };

        return { ...getPaginatedResponse(letters, total, page, limit), metadata };
    },

    async updateStatus(id: string, status: string) {
        const existing = await prisma.letter.findUnique({ where: { id } });
        if (!existing) throw new Error('Letter not found');

        if (existing.status === 'SENT' && status === 'DRAFT') {
            throw new Error('Cannot reopen a frozen letter. Immutability is enforced.');
        }

        const letter = await prisma.letter.update({
            where: { id },
            data: { status }
        });

        const branchUsers = await prisma.user.findMany({
            where: { branchId: letter.branchId }
        });

        for (const u of branchUsers) {
            await createNotification(u.id, `Letter Update: ${letter.titleEn}`, `Letter status changed to ${status}`, 'INFO', `/letters`);
        }

        return letter;
    },

    async createManualLetter(user: any, data: { 
        branchId?: string;
        titleEn: string; titleHi?: string; titleTa?: string;
        contentEn: string; contentHi?: string; contentTa?: string;
        period?: string;
        isExternal?: boolean;
        recipientName?: string;
        recipientAddress?: string;
        salutation?: string;
    }) {
        const RO_DATA = await getRegionalOfficeData();
        
        let targetBranchId = data.branchId;
        if (!targetBranchId) {
            const roBranch = await prisma.branch.findFirst({ where: { code: '3933' } });
            targetBranchId = roBranch?.id;
            if (!targetBranchId) {
                const firstBranch = await prisma.branch.findFirst();
                targetBranchId = firstBranch?.id;
            }
        }
        
        if (!targetBranchId) throw new Error('No valid branch found to associate with letter');

        const referenceNo = await generateReference('LETTER', 'Planning Department');

        return await prisma.letter.create({
            data: {
                type: 'MANUAL',
                status: 'DRAFT',
                titleEn: data.titleEn,
                titleHi: data.titleHi,
                titleTa: data.titleTa,
                contentEn: data.contentEn,
                contentHi: data.contentHi,
                contentTa: data.contentTa,
                branchId: targetBranchId,
                period: data.period || format(new Date(), 'MMM yyyy'),
                orgMeta: RO_DATA,
                referenceNo,
                version: 1,
                isExternal: data.isExternal || false,
                recipientName: data.recipientName,
                recipientAddress: data.recipientAddress,
                salutation: data.salutation,
                authorId: user.id,
                signatoryId: (data as any).signatoryId
            }
        });
    },

    async getTemplates(category?: string) {
        return await (prisma as any).letterTemplate.findMany({
            where: category ? { category } : {},
            orderBy: { name: 'asc' }
        });
    },

    async createTemplate(data: any) {
        return await (prisma as any).letterTemplate.create({ data });
    },

    async updateLetter(id: string, updates: { 
        titleEn?: string; titleHi?: string; titleTa?: string; 
        contentEn?: string; contentHi?: string; contentTa?: string;
        isExternal?: boolean; recipientName?: string; recipientAddress?: string; salutation?: string;
        signatoryId?: string;
    }) {
        const currentLetter: any = await prisma.letter.findUnique({ where: { id } });
        if (!currentLetter) throw new Error('Letter not found');

        if (currentLetter.status === 'DRAFT') {
            return await prisma.letter.update({
                where: { id },
                data: updates
            });
        } else {
            const RO_DATA = await getRegionalOfficeData();

            return await prisma.letter.create({
                data: {
                    type: currentLetter.type,
                    titleEn: updates.titleEn || currentLetter.titleEn,
                    titleHi: updates.titleHi || currentLetter.titleHi,
                    titleTa: updates.titleTa || currentLetter.titleTa,
                    contentEn: updates.contentEn || currentLetter.contentEn,
                    contentHi: updates.contentHi || currentLetter.contentHi,
                    contentTa: updates.contentTa || currentLetter.contentTa,
                    branchId: currentLetter.branchId,
                    valueAtTime: currentLetter.valueAtTime,
                    budgetAtTime: currentLetter.budgetAtTime,
                    period: currentLetter.period,
                    orgMeta: RO_DATA,
                    status: 'DRAFT',
                    version: currentLetter.version + 1,
                    previousVersionId: currentLetter.id,
                    isExternal: updates.isExternal !== undefined ? updates.isExternal : currentLetter.isExternal,
                    recipientName: updates.recipientName || currentLetter.recipientName,
                    recipientAddress: updates.recipientAddress || currentLetter.recipientAddress,
                    salutation: updates.salutation || currentLetter.salutation,
                    signatoryId: updates.signatoryId || currentLetter.signatoryId,
                    authorId: currentLetter.authorId
                }
            });
        }
    },

    async getLetterById(id: string) {
        return prisma.letter.findUnique({
            where: { id },
            include: {
                branch: {
                    include: {
                        headUser: {
                            include: { designation: true }
                        }
                    }
                },
                signatory: {
                    include: { designation: true }
                },
                author: {
                    include: { designation: true }
                }
            }
        });
    },

    async buildLetterPdfPayload(letterInput: any) {
        const letter = letterInput?.branch ? letterInput : await this.getLetterById(letterInput.id);
        if (!letter) throw new Error('Letter not found');

        const RO_DATA = await getRegionalOfficeData();
        const org = (letter.orgMeta as any) || {};
        const isOpRisk = letter.type === 'OP_RISK';
        const isBudget = letter.type === 'BUDGET_ALLOTMENT';

        const deptCode = org.deptCode;
        const issuingDept = await prisma.department.findFirst({
            where: deptCode
                ? { code: deptCode }
                : { OR: [{ nameEn: 'Planning Department' }, { code: 'PLNG' }] }
        });

        const deptSealSrc = issuingDept?.sealPath
            ? imageToBase64(issuingDept.sealPath)
            : imageToBase64('assets/dept_seal.png');

        const selectedSignatory = letter.signatory;
        const signatoryName = selectedSignatory?.fullNameEn || org.signatoryName || (isOpRisk ? 'ANNAMALAI SM' : (RO_DATA.signatoryName || 'Regional Manager'));
        const signatoryNameHi = selectedSignatory?.fullNameHi || org.signatoryNameHi || (isOpRisk ? 'अन्नामलाई एस एम' : RO_DATA.signatoryNameHi);
        const signatoryNameTa = selectedSignatory?.fullNameTa || org.signatoryNameTa || (isOpRisk ? 'அண்ணாமலை எஸ் எம்' : RO_DATA.signatoryNameTa);

        const signatoryTitleEn = selectedSignatory?.designationEn || selectedSignatory?.designation?.nameEn || org.signingAuthEn || (isOpRisk ? 'RO Chief Manager' : (RO_DATA.signingAuthEn || 'Regional Manager'));
        const signatoryTitleHi = selectedSignatory?.designationHi || selectedSignatory?.designation?.nameHi || org.signingAuthHi || (isOpRisk ? 'मुख्य प्रबंधक (क्षे.का.)' : (RO_DATA.signingAuthHi || 'क्षेत्रीय प्रबंधक'));
        const signatoryTitleTa = selectedSignatory?.designationTa || selectedSignatory?.designation?.nameTa || org.signingAuthTa || (isOpRisk ? 'தலைமை மேலாலர் (ம.அ.)' : (RO_DATA.signingAuthTa || 'மண்டல மேலாலர்'));

        const head = letter.branch?.headUser;
        const recipient = letter.isExternal
            ? {
                name: letter.recipientName || undefined,
                designation: undefined,
                bankName: undefined,
                branchName: undefined,
                branchCode: undefined,
            }
            : {
                name: head ? `${head.gender === 'F' ? 'Smt. ' : 'Shri. '}${toTitleCase(head.fullNameEn)}` : undefined,
                nameHi: head?.fullNameHi ? `${head.gender === 'F' ? 'श्रीमती. ' : 'श्री. '}${head.fullNameHi}` : undefined,
                nameTa: head?.fullNameTa ? `${head.gender === 'F' ? 'திருமதி. ' : 'திரு. '}${head.fullNameTa}` : undefined,
                designation: head?.designation?.nameEn ? toTitleCase(head.designation.nameEn) : (letter.branch ? 'The Branch Manager' : undefined),
                designationHi: head?.designation?.nameHi || (letter.branch ? 'शाखा प्रबंधक' : undefined),
                designationTa: head?.designation?.nameTa || (letter.branch ? 'கிளை மேலாளர்' : undefined),
                bankName: RO_DATA.bankNameEn,
                branchName: letter.branch ? toTitleCase(letter.branch.nameEn) : undefined,
                branchNameHi: letter.branch?.nameHi ? letter.branch.nameHi : undefined,
                branchNameTa: letter.branch?.nameTa ? letter.branch.nameTa : undefined,
                branchCode: letter.branch?.code
            };

        const externalRecipientHtml = letter.isExternal && (letter.recipientName || letter.recipientAddress)
            ? `
                <div style="margin-bottom: 12px; font-weight: 700; line-height: 1.55;">
                    <div>To,</div>
                    ${letter.recipientName ? `<div>${letter.recipientName}</div>` : ''}
                    ${letter.recipientAddress ? `<div style="white-space: pre-line;">${letter.recipientAddress}</div>` : ''}
                </div>
            `
            : '';

        const internalRecipientHtml = !letter.isExternal && (recipient.name || recipient.branchName)
            ? `
                <div class="to-address" style="margin: 15px 0 20px 0; font-size: 14px; line-height: 1.4; color: #1e293b; border-left: 3px solid #21357f; padding-left: 12px;">
                    <div class="to-label" style="font-weight: 800; color: #1e3a8a; margin-bottom: 4px; text-transform: uppercase; font-size: 11px;">To,</div>
                    
                    <!-- 1. Name Row -->
                    <div class="to-row" style="font-weight: 700; margin-bottom: 2px;">
                        <span class="hindi" style="font-size: 11.5px;">${recipient.nameHi || ''}</span> 
                        ${recipient.nameHi && recipient.nameTa ? ' / ' : ''}
                        <span class="tamil" style="font-size: 10px;">${recipient.nameTa || ''}</span>
                        ${(recipient.nameHi || recipient.nameTa) ? '<br/>' : ''}
                        ${recipient.name || ''}
                    </div>

                    <!-- 2. Title/Designation Row -->
                    <div class="to-row" style="font-weight: 700; margin-bottom: 2px; color: #334155;">
                        <span class="hindi" style="font-size: 11px;">${recipient.designationHi || ''}</span>
                        ${recipient.designationHi && recipient.designationTa ? ' / ' : ''}
                        <span class="tamil" style="font-size: 9px;">${recipient.designationTa || ''}</span>
                        <br/>
                        ${recipient.designation || ''}
                    </div>

                    <!-- 3. Branch Row -->
                    <div class="to-row" style="font-weight: 700; margin-top: 4px;">
                        <span class="hindi" style="font-size: 11.5px;">${recipient.branchNameHi || ''} शाखा</span> / 
                        <span class="tamil" style="font-size: 10px;">${recipient.branchNameTa || ''} கிளை</span>
                        <br/>
                        ${recipient.branchName || ''} Branch (${recipient.branchCode || ''}).
                    </div>
                </div>
            `
            : '';

        const subjectEn = org.title || letter.titleEn || '';
        const subjectHtml = subjectEn ? `
            <div class="subject" style="text-align: center; font-weight: 800; font-size: 18px; text-transform: uppercase; margin: 15px 0 20px 0; color: #000; text-decoration: underline;">
                ${subjectEn}
            </div>` : '';

        const bodyHtml = `${externalRecipientHtml}${internalRecipientHtml}${subjectHtml}${buildLetterBodyHtml(letter.contentEn || '', org, letter)}`;
        const refNo = letter.referenceNo || `RO/ADMIN/${new Date(letter.createdAt).getFullYear()}/${letter.id.slice(-4).toUpperCase()}`;
        const letterDate = resolveLetterDate(letter, org);
        const cashData = org.cashData || [];
        
        const html = buildPremiumLayout({
            title: `${letter.titleEn}${isOpRisk ? ` - ${letter.branch?.code || ''}` : ''}`,
            titleHi: letter.titleHi || undefined,
            titleTa: letter.titleTa || undefined,
            refNo,
            date: letterDate,
            letterCategory: letter.type,
            bodyHtml,
            signatoryName,
            signatoryNameHi,
            signatoryNameTa,
            signatoryTitleEn,
            signatoryTitleHi,
            signatoryTitleTa,
            organization: RO_DATA,
            deptSealSrc,
            orgMeta: org,
            isAdvisory: isOpRisk,
            cashData,
            isBudget,
            hideApprovedStatus: isOpRisk,
            recipient,
            salutation: letter.salutation || 'Dear Sir/Madam,'
        });

        let safeFileName = '';
        if (isOpRisk) {
            const [d, m, y] = letterDate.split('.');
            const yyyymmdd = `${y}${m}${d}`;
            const sol = letter.branch?.code || '0000';
            safeFileName = `${sol}_OA_${yyyymmdd}.pdf`;
        } else {
            const baseName = letter.isExternal
                ? (letter.recipientName || letter.titleEn || 'Letter')
                : `${letter.branch?.code || '0000'}_${letter.branch?.nameEn || letter.titleEn || 'Letter'}`;
            
            safeFileName = baseName
                .replace(/\s+/g, '_')
                .replace(/[^a-zA-Z0-9_\-.]/g, '')
                .replace(/_+/g, '_') || `letter_${letter.id}`;
            safeFileName = `${safeFileName}.pdf`;
        }

        return {
            letter,
            html,
            refNo,
            safeFileName,
        };
    },

    async generateLetterPdfBuffer(letterInput: any, browser?: any) {
        const payload = await this.buildLetterPdfPayload(letterInput);
        const pdfBuffer = await generatePDF(payload.html, browser, payload.refNo);
        return {
            ...payload,
            pdfBuffer,
        };
    },

    async generateDrafts(period: string) {
        // Query from Fact table instead of Snapshot
        const latestFacts = await prisma.fact.findMany({
            where: { metric: 'TOTAL_DEPOSITS' },
            orderBy: [{ date: 'desc' }, { value: 'desc' }],
            include: {
                branch: {
                    include: { headUser: { include: { designation: true } } }
                }
            }
        });

        if (latestFacts.length === 0) throw new Error('No deposit data found to generate letters');

        const latestDate = latestFacts[0].date;
        const currentSnapshots = latestFacts.filter(f => f.date.getTime() === latestDate.getTime() && f.branch?.type !== 'REGIONAL OFFICE');

        const topBranches = currentSnapshots.slice(0, 3);
        const bottomBranches = currentSnapshots.slice(-3).reverse();

        const currentOrgMeta = await getRegionalOfficeData();

        const getMarchFigure = async (unitId: string, metric: string, snapDate: Date) => {
            const date = new Date(snapDate);
            const currentYear = date.getFullYear();
            const currentMonth = date.getMonth();
            const marchYear = currentMonth <= 2 ? currentYear - 1 : currentYear;
            const marchDate = new Date(Date.UTC(marchYear, 2, 31));

            const marchFact = await prisma.fact.findFirst({
                where: { unitId, metric, date: marchDate },
                orderBy: { createdAt: 'desc' }
            });
            return { value: Number(marchFact?.value || 0), date: marchDate };
        };

        const createdLetters = [];

        for (const f of topBranches) {
            const existingLetter = await prisma.letter.findFirst({
                where: { branchId: f.unitId, period: period, type: 'APPRECIATION' }
            });

            if (!existingLetter) {
                const headDesignation = toTitleCase(f.branch?.headUser?.designation?.nameEn || "Branch Head");
                const marchInfo = await getMarchFigure(f.unitId, f.metric, f.date);
                const actualVal = Number(f.value);
                const performanceData = {
                    march31stDate: marchInfo.date,
                    march31st: marchInfo.value,
                    latestDate: f.date,
                    latest: actualVal,
                    budget: 0,
                    gap: actualVal - marchInfo.value,
                    status: '+ve'
                };
                const letterMeta = { ...currentOrgMeta, performanceData };

                const letter = await prisma.letter.create({
                    data: {
                        type: 'APPRECIATION',
                        titleEn: `Total Deposits Growth Performance - ${period}`,
                        contentEn: `Dear Sir/Madam,\n\nWe are writing to formally acknowledge and commend the exceptional performance of the ${toTitleCase(f.branch?.nameEn || "Branch")} Branch under your leadership as ${headDesignation} for the period of ${period}.\n\nA review of the branch's performance in Total Deposits reveals an achievement of ₹ ${actualVal.toFixed(2)} Cr.\n\n[PERFORMANCE_TABLE]\n\nSuch dedication and a results-oriented approach are highly appreciated by the management. Keep up the excellent work!`,
                        branchId: f.unitId,
                        valueAtTime: actualVal,
                        period: period,
                        orgMeta: letterMeta
                    }
                });
                createdLetters.push(letter);
            }
        }

        for (const f of bottomBranches) {
            const existingLetter = await prisma.letter.findFirst({
                where: { branchId: f.unitId, period: period, type: 'EXPLANATION' }
            });

            if (!existingLetter) {
                const headDesignation = toTitleCase(f.branch?.headUser?.designation?.nameEn || "Branch Head");
                const marchInfo = await getMarchFigure(f.unitId, f.metric, f.date);
                const actualVal = Number(f.value);
                const performanceData = {
                    march31stDate: marchInfo.date,
                    march31st: marchInfo.value,
                    latestDate: f.date,
                    latest: actualVal,
                    budget: 0,
                    gap: actualVal - marchInfo.value,
                    status: actualVal >= marchInfo.value ? '+ve' : '-ve'
                };
                const letterMeta = { ...currentOrgMeta, performanceData };

                const letter = await prisma.letter.create({
                    data: {
                        type: 'EXPLANATION',
                        titleEn: `Review of Total Deposits - ${period}`,
                        contentEn: `Dear Sir/Madam,\n\nWe are writing to draw your urgent attention to the performance of the ${toTitleCase(f.branch?.nameEn || "Branch")} Branch for the period of ${period}, specifically regarding the Total Deposits portfolio.\n\n[PERFORMANCE_TABLE]\n\nAs the ${headDesignation}, you are requested to analyze the reasons for any shortfall and formulate a concrete, time-bound Action Plan.`,
                        branchId: f.unitId,
                        valueAtTime: actualVal,
                        period: period,
                        orgMeta: letterMeta
                    }
                });
                createdLetters.push(letter);
            }
        }

        return createdLetters;
    }
};
