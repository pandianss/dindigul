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
                    parameter: true,
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

        // Block transition from SENT to DRAFT if status is being updated to DRAFT
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
                    parameterId: currentLetter.parameterId,
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
                parameter: true,
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
        const signatoryTitleTa = selectedSignatory?.designationTa || selectedSignatory?.designation?.nameTa || org.signingAuthTa || (isOpRisk ? 'தலைமை மேலாளர் (ம.அ.)' : (RO_DATA.signingAuthTa || 'மண்டல மேலாளர்'));

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
                designationHi: head?.designation?.nameHi || undefined,
                designationTa: head?.designation?.nameTa || undefined,
                bankName: RO_DATA.bankNameEn,
                branchName: letter.branch ? toTitleCase(letter.branch.nameEn) : undefined,
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

        const bodyHtml = `${externalRecipientHtml}${buildLetterBodyHtml(letter.contentEn || '', org, letter)}`;
        const refNo = letter.referenceNo || `RO/ADMIN/${new Date(letter.createdAt).getFullYear()}/${letter.id.slice(-4).toUpperCase()}`;
        const letterDate = resolveLetterDate(letter, org);
        const html = buildPremiumLayout({
            title: `${letter.titleEn}${isOpRisk ? ` - ${letter.branch?.code || ''}` : ''}`,
            titleHi: letter.titleHi || undefined,
            titleTa: letter.titleTa || undefined,
            refNo,
            date: letterDate,
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
            cashData: org.cashData || [],
            isBudget,
            hideApprovedStatus: isOpRisk,
            recipient,
            salutation: letter.salutation || 'Dear Sir/Madam,'
        });

        const baseName = letter.isExternal
            ? (letter.recipientName || letter.titleEn || 'Letter')
            : `${letter.branch?.code || '0000'}_${letter.branch?.nameEn || letter.titleEn || 'Letter'}`;
        const safeFileName = baseName
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_\-.]/g, '')
            .replace(/_+/g, '_') || `letter_${letter.id}`;

        return {
            letter,
            html,
            refNo,
            safeFileName: `${safeFileName}.pdf`,
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
        const param = await prisma.parameter.findUnique({ where: { code: 'TOTAL_DEPOSITS' } });
        if (!param) throw new Error('Parameter TOTAL_DEPOSITS not found');

        const snapshots = await prisma.snapshot.findMany({
            where: { parameterId: param.id },
            orderBy: { value: 'desc' },
            include: {
                branch: {
                    include: {
                        headUser: {
                            include: {
                                designation: true
                            }
                        }
                    }
                }
            }
        });

        if (snapshots.length === 0) throw new Error('No snapshots found for this period');

        const uniqueSnapshots: any[] = [];
        const seenBranchIds = new Set();
        for (const snap of snapshots) {
            if (!seenBranchIds.has(snap.branchId) && snap.branch?.type !== 'REGIONAL OFFICE') {
                uniqueSnapshots.push(snap);
                seenBranchIds.add(snap.branchId);
            }
        }

        if (uniqueSnapshots.length === 0) throw new Error('No unique snapshots found for this period');

        const topBranches = uniqueSnapshots.slice(0, 3);
        const bottomBranches = uniqueSnapshots.slice(-3).reverse();

        const getCurrentOrgMeta = async () => {
            return await getRegionalOfficeData();
        };

        const currentOrgMeta = await getCurrentOrgMeta();

        const getMarchFigure = async (branchId: string, paramId: string, snapDate: Date) => {
            const date = new Date(snapDate);
            const currentYear = date.getFullYear();
            const currentMonth = date.getMonth();
            const marchYear = currentMonth <= 2 ? currentYear - 1 : currentYear;
            const marchStart = new Date(marchYear, 2, 1, 0, 0, 0);
            const marchEnd = new Date(marchYear, 2, 31, 23, 59, 59);

            const marchSnap = await prisma.snapshot.findFirst({
                where: {
                    branchId,
                    parameterId: paramId,
                    date: { gte: marchStart, lte: marchEnd }
                },
                orderBy: { date: 'desc' }
            });
            return { value: marchSnap?.value || 0, date: marchEnd };
        };

        const createdLetters = [];

        for (const snap of topBranches) {
            const existingLetter = await prisma.letter.findFirst({
                where: { branchId: snap.branchId!, period: period, type: 'APPRECIATION' }
            });

            if (!existingLetter) {
                const headDesignation = toTitleCase(snap.branch?.headUser?.designation?.nameEn || "Branch Head");

                const marchInfo = await getMarchFigure(snap.branchId!, param.id, snap.date);
                const gap = snap.value - (snap.budget || 0);
                const performanceData = {
                    march31stDate: marchInfo.date,
                    march31st: marchInfo.value,
                    latestDate: snap.date,
                    latest: snap.value,
                    budget: snap.budget || 0,
                    gap: gap,
                    status: gap >= 0 ? '+ve' : '-ve'
                };
                const letterMeta = { ...currentOrgMeta, performanceData };

                const letter = await prisma.letter.create({
                    data: {
                        type: 'APPRECIATION',
                        titleEn: `${param.nameEn} Target Achievement - ${period}`,
                        contentEn: `Dear Sir/Madam,\n\nWe are writing to formally acknowledge and commend the exceptional performance of the ${toTitleCase(snap.branch?.nameEn || "Branch")} Branch under your leadership as ${headDesignation} for the period of ${period}.\n\nA review of the branch's performance in the ${param.nameEn} portfolio reveals an outstanding achievement of ₹ ${snap.value.toLocaleString()} Cr against the assigned target of ₹ ${snap.budget?.toLocaleString() || '0'} Cr.\n\n[PERFORMANCE_TABLE]\n\nSuch dedication and a results-oriented approach are highly appreciated by the management. We place on record our appreciation for the diligent efforts put forth by you and your entire team. We trust that you will continue to maintain this momentum and strive for even greater milestones in the upcoming quarters.\n\nKeep up the excellent work!`,
                        branchId: snap.branchId!,
                        parameterId: param.id,
                        valueAtTime: snap.value,
                        budgetAtTime: snap.budget,
                        period: period,
                        orgMeta: letterMeta
                    }
                });
                createdLetters.push(letter);
            }
        }

        for (const snap of bottomBranches) {
            const existingLetter = await prisma.letter.findFirst({
                where: { branchId: snap.branchId!, period: period, type: 'EXPLANATION' }
            });

            if (!existingLetter) {
                const headDesignation = snap.branch?.type === 'REGIONAL OFFICE' 
                    ? "Region Head" 
                    : toTitleCase(snap.branch?.headUser?.designation?.nameEn || "Branch Head");

                const marchInfo = await getMarchFigure(snap.branchId!, param.id, snap.date);
                const gap = snap.value - (snap.budget || 0);
                const performanceData = {
                    march31stDate: marchInfo.date,
                    march31st: marchInfo.value,
                    latestDate: snap.date,
                    latest: snap.value,
                    budget: snap.budget || 0,
                    gap: gap,
                    status: gap >= 0 ? '+ve' : '-ve'
                };
                const letterMeta = { ...currentOrgMeta, performanceData };

                const letter = await prisma.letter.create({
                    data: {
                        type: 'EXPLANATION',
                        titleEn: `Review of ${param.nameEn} - ${period}`,
                        contentEn: `Dear Sir/Madam,\n\nWe are writing to draw your urgent attention to the performance of the ${toTitleCase(snap.branch?.nameEn || "Branch")} Branch for the period of ${period}, specifically regarding the ${param.nameEn} portfolio.\n\nA detailed review indicates a significant shortfall in achieving the allocated targets. Against an expected budget of ₹ ${snap.budget?.toLocaleString() || '0'} Cr, the branch has only achieved ₹ ${snap.value.toLocaleString()} Cr. This underperformance is a matter of serious concern for the Management.\n\n[PERFORMANCE_TABLE]\n\nAs the ${headDesignation}, you are requested to analyze the reasons for this shortfall and formulate a concrete, time-bound Action Plan to bridge this gap. You are hereby advised to submit this detailed Plan of Action to the Regional Office within the next 7 days without fail.\n\nWe expect a marked improvement in your branch's performance in the coming weeks. Please treat this matter as highly important.`,
                        branchId: snap.branchId!,
                        parameterId: param.id,
                        valueAtTime: snap.value,
                        budgetAtTime: snap.budget,
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
