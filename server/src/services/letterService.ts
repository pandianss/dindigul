import { prisma } from '../index';
import { createNotification } from './notificationService';
import { getPaginatedResponse } from '../utils/pagination';

const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
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
                    parameter: true
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

        const roBranch = await prisma.branch.findFirst({
            where: { type: 'RO' }
        });

        let config = await prisma.organizationConfig.findUnique({
            where: { id: 'singleton' }
        });

        if (!config) {
            config = await prisma.organizationConfig.create({
                data: {
                    id: 'singleton',
                    bankNameEn: "Indian Overseas Bank",
                    bankNameTa: "இந்தியன் ஓவர்சீஸ் வங்கி",
                    bankNameHi: "इंडियन ओवरसीज बैंक",
                    signingAuthEn: "Regional Manager",
                    signingAuthTa: "மண்டல மேலாளர்",
                    signingAuthHi: "क्षेत्रीय प्रबंधक"
                }
            });
        }

        const organization = {
            ...config,
            officeNameEn: roBranch?.nameEn || "Dindigul Regional Office",
            officeNameTa: roBranch?.nameTa || "திண்டுக்கல் மண்டல அலுவலகம்",
            officeNameHi: roBranch?.nameHi || "डिंडिगुल क्षेत्रीय कार्यालय",
            address: roBranch?.address || roBranch?.addressTa || roBranch?.addressHi || "",
            phone: roBranch?.phone || "+91 451 2420000",
            email: roBranch?.email || "ro.dindigul@bank.com"
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

    async updateLetter(id: string, titleEn?: string, contentEn?: string) {
        const currentLetter = await prisma.letter.findUnique({ where: { id } });
        if (!currentLetter) throw new Error('Letter not found');

        if (currentLetter.status === 'DRAFT') {
            return await prisma.letter.update({
                where: { id },
                data: { titleEn, contentEn }
            });
        } else {
            const getCurrentOrgMeta = async () => {
                let organization = await prisma.organizationConfig.findUnique({
                    where: { id: 'singleton' }
                });

                const roBranch = await prisma.branch.findFirst({
                    where: { type: 'RO' }
                });

                return {
                    ...organization,
                    officeNameEn: roBranch?.nameEn || "Dindigul Regional Office",
                    officeNameTa: roBranch?.nameTa || "திண்டுக்கல் மண்டல அலுவலகம்",
                    officeNameHi: roBranch?.nameHi || "डिंडिगुल क्षेत्रीय कार्यालय",
                    address: roBranch?.address || "Regional Office, 123 Madurai Road, Dindigul - 624001, Tamil Nadu",
                    addressTa: roBranch?.addressTa || "மண்டல அலுவலகம், 123 மதுரை ரோடு, திண்டுக்கல் - 624001, தமிழ்நாடு",
                    addressHi: roBranch?.addressHi || "क्षेत्रीय कार्यालय, 123 मदुरै रोड, डिंडीगुल - 624001, तमिलनाडु"
                };
            };

            const currentOrgMeta = await getCurrentOrgMeta();

            return await prisma.letter.create({
                data: {
                    type: currentLetter.type,
                    titleEn: titleEn || currentLetter.titleEn,
                    contentEn: contentEn || currentLetter.contentEn,
                    branchId: currentLetter.branchId,
                    parameterId: currentLetter.parameterId,
                    valueAtTime: currentLetter.valueAtTime,
                    budgetAtTime: currentLetter.budgetAtTime,
                    period: currentLetter.period,
                    orgMeta: currentOrgMeta,
                    status: 'DRAFT',
                    version: currentLetter.version + 1,
                    previousVersionId: currentLetter.id
                }
            });
        }
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
            if (!seenBranchIds.has(snap.branchId)) {
                uniqueSnapshots.push(snap);
                seenBranchIds.add(snap.branchId);
            }
        }

        if (uniqueSnapshots.length === 0) throw new Error('No unique snapshots found for this period');

        const topBranches = uniqueSnapshots.slice(0, 3);
        const bottomBranches = uniqueSnapshots.slice(-3).reverse();

        const getCurrentOrgMeta = async () => {
            let organization = await prisma.organizationConfig.findUnique({
                where: { id: 'singleton' }
            });

            const roBranch = await prisma.branch.findFirst({
                where: { type: 'RO' }
            });

            return {
                ...organization,
                officeNameEn: roBranch?.nameEn || "Dindigul Regional Office",
                officeNameTa: roBranch?.nameTa || "திண்டுக்கல் மண்டல அலுவலகம்",
                officeNameHi: roBranch?.nameHi || "डिंडिगुल क्षेत्रीय कार्यालय",
                address: roBranch?.address || "Regional Office, 123 Madurai Road, Dindigul - 624001, Tamil Nadu",
                addressTa: roBranch?.addressTa || "மண்டல அலுவலகம், 123 மதுரை ரோடு, திண்டுக்கல் - 624001, தமிழ்நாடு",
                addressHi: roBranch?.addressHi || "क्षेत्रीय कार्यालय, 123 मदुरै रोड, डिंडीगुल - 624001, तमिलनाडु",
                phone: roBranch?.phone || "+91 451 2420000",
                email: roBranch?.email || "ro.dindigul@bank.com"
            };
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
