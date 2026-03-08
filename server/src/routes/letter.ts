import { Router } from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';
import { createNotification } from '../services/notificationService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for scanned letter uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(process.cwd(), 'uploads', 'letters');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `signed-letter-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB hard cap
        files: 1,
    },
    fileFilter: (_req, file, cb) => {
        const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${ext}. Allowed: PDF, JPG, PNG`));
        }
    },
});

const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
};

// Upload scanned signed copy of a letter
router.post('/:id/upload-scan', authenticateToken, upload.single('document'), async (req: any, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'No document file uploaded' });
        }

        const scannedCopyUrl = `/uploads/letters/${req.file.filename}`;

        const letter = await (prisma as any).letter.update({
            where: { id },
            data: { scannedCopyUrl }
        });

        res.json({ message: 'Scanned document uploaded successfully', letter });
    } catch (error) {
        console.error('Error uploading scanned letter:', error);
        res.status(500).json({ error: 'Failed to upload document' });
    }
});

// Get all letters — BRANCH_USER sees only their branch (GAP 03)
router.get('/', authenticateToken, async (req: any, res) => {
    try {
        const { branchId, type } = req.query;
        const scopedBranchId = req.user?.role === 'BRANCH_USER'
            ? req.user.branchId
            : (branchId ? String(branchId) : undefined);
        const letters = await (prisma as any).letter.findMany({
            where: {
                ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
                ...(type ? { type: String(type) } : {})
            },
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
            }
        });

        // GAP: Dynamic layout metadata
        const regionHead = await (prisma as any).user.findFirst({
            where: { isRegionHead: true },
            include: { designation: true }
        });

        const roBranch = await prisma.branch.findFirst({
            where: { type: 'RO' }
        });

        let config = await (prisma as any).organizationConfig.findUnique({
            where: { id: 'singleton' }
        });

        if (!config) {
            config = await (prisma as any).organizationConfig.create({
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

        res.json({ letters, metadata });
    } catch (error) {
        console.error('Error fetching letters:', error);
        res.status(500).json({ error: 'Failed to fetch letters' });
    }
});

// Update letter status
router.patch('/:id/status', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const letter = await (prisma as any).letter.update({
            where: { id },
            data: { status }
        });

        // Notify branch users if status changed to SENT or similar
        const branchUsers = await (prisma as any).user.findMany({
            where: { branchId: letter.branchId }
        });

        for (const u of branchUsers) {
            await createNotification(u.id, `Letter Update: ${letter.titleEn}`, `Letter status changed to ${status}`, 'INFO', `/letters`);
        }

        res.json(letter);
    } catch (error) {
        console.error('Error updating letter status:', error);
        res.status(500).json({ error: 'Failed to update letter status' });
    }
});

// GAP 19: Update letter with versioning
router.put('/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { titleEn, contentEn } = req.body;
    try {
        const currentLetter = await (prisma as any).letter.findUnique({ where: { id } });
        if (!currentLetter) return res.status(404).json({ error: 'Letter not found' });

        if (currentLetter.status === 'DRAFT') {
            const updated = await (prisma as any).letter.update({
                where: { id },
                data: { titleEn, contentEn }
            });
            res.json(updated);
        } else {
            // Create new version (GAP 19)
            // Helper to get current organization metadata snapshot
            const getCurrentOrgMeta = async () => {
                let organization = await (prisma as any).organizationConfig.findUnique({
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

            const newVersion = await (prisma as any).letter.create({
                data: {
                    type: currentLetter.type,
                    titleEn: titleEn || currentLetter.titleEn,
                    contentEn: contentEn || currentLetter.contentEn,
                    branchId: currentLetter.branchId,
                    parameterId: currentLetter.parameterId,
                    valueAtTime: currentLetter.valueAtTime,
                    budgetAtTime: currentLetter.budgetAtTime,
                    period: currentLetter.period,
                    orgMeta: currentOrgMeta, // Snapshot the latest org details for the new version
                    status: 'DRAFT',
                    version: currentLetter.version + 1,
                    previousVersionId: currentLetter.id
                }
            });
            res.json({ message: 'New version created', letter: newVersion });
        }
    } catch (err) {
        console.error('Update letter error:', err);
        res.status(500).json({ error: 'Failed to update letter' });
    }
});

// Automated draft generation logic
router.post('/generate', async (req, res) => {
    const { period } = req.body; // e.g. "Aug 2025"
    if (!period) return res.status(400).json({ error: 'Period is required' });

    try {
        // Find top 3 and bottom 3 branches by TOTAL_DEPOSITS as an example
        const param = await (prisma as any).parameter.findUnique({ where: { code: 'TOTAL_DEPOSITS' } });
        if (!param) return res.status(404).json({ error: 'Parameter TOTAL_DEPOSITS not found' });

        const snapshots = await (prisma as any).snapshot.findMany({
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

        if (snapshots.length === 0) return res.status(404).json({ error: 'No snapshots found for this period' });

        // Filter out duplicate branches to ensure we only get unique branches
        const uniqueSnapshots = [];
        const seenBranchIds = new Set();
        for (const snap of snapshots) {
            if (!seenBranchIds.has(snap.branchId)) {
                uniqueSnapshots.push(snap);
                seenBranchIds.add(snap.branchId);
            }
        }

        if (uniqueSnapshots.length === 0) return res.status(404).json({ error: 'No unique snapshots found for this period' });

        const topBranches = uniqueSnapshots.slice(0, 3);
        const bottomBranches = uniqueSnapshots.slice(-3).reverse();

        // Helper to get current organization metadata snapshot
        const getCurrentOrgMeta = async () => {
            let organization = await (prisma as any).organizationConfig.findUnique({
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

        // Helper to get March 31st figure
        const getMarchFigure = async (branchId: string, paramId: string, snapDate: Date) => {
            const date = new Date(snapDate);
            const currentYear = date.getFullYear();
            const currentMonth = date.getMonth(); // 0 is Jan, 2 is March
            const marchYear = currentMonth <= 2 ? currentYear - 1 : currentYear;
            const marchStart = new Date(marchYear, 2, 1, 0, 0, 0);
            const marchEnd = new Date(marchYear, 2, 31, 23, 59, 59);

            const marchSnap = await (prisma as any).snapshot.findFirst({
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

        // Generate Appreciation Letters
        for (const snap of topBranches) {
            const existingLetter = await (prisma as any).letter.findFirst({
                where: { branchId: snap.branchId, period: period, type: 'APPRECIATION' }
            });

            if (!existingLetter) {
                const headName = toTitleCase(snap.branch.headUser?.fullNameEn || "The Branch Manager");
                const headDesignation = toTitleCase(snap.branch.headUser?.designation?.nameEn || "Branch Head");

                const marchInfo = await getMarchFigure(snap.branchId, param.id, snap.date);
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

                const letter = await (prisma as any).letter.create({
                    data: {
                        type: 'APPRECIATION',
                        titleEn: `${param.nameEn} Target Achievement - ${period}`,
                        contentEn: `Dear Sir/Madam,\n\nWe are writing to formally acknowledge and commend the exceptional performance of the ${toTitleCase(snap.branch.nameEn)} Branch under your leadership as ${headDesignation} for the period of ${period}.\n\nA review of the branch's performance in the ${param.nameEn} portfolio reveals an outstanding achievement of ₹ ${snap.value.toLocaleString()} Cr against the assigned target of ₹ ${snap.budget?.toLocaleString() || '0'} Cr.\n\n[PERFORMANCE_TABLE]\n\nSuch dedication and a results-oriented approach are highly appreciated by the management. We place on record our appreciation for the diligent efforts put forth by you and your entire team. We trust that you will continue to maintain this momentum and strive for even greater milestones in the upcoming quarters.\n\nKeep up the excellent work!`,
                        branchId: snap.branchId,
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

        // Generate Explanation Letters
        for (const snap of bottomBranches) {
            const existingLetter = await (prisma as any).letter.findFirst({
                where: { branchId: snap.branchId, period: period, type: 'EXPLANATION' }
            });

            if (!existingLetter) {
                const headName = toTitleCase(snap.branch.headUser?.fullNameEn || "The Branch Manager");
                const headDesignation = toTitleCase(snap.branch.headUser?.designation?.nameEn || "Branch Head");

                const marchInfo = await getMarchFigure(snap.branchId, param.id, snap.date);
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

                const letter = await (prisma as any).letter.create({
                    data: {
                        type: 'EXPLANATION',
                        titleEn: `Review of ${param.nameEn} - ${period}`,
                        contentEn: `Dear Sir/Madam,\n\nWe are writing to draw your urgent attention to the performance of the ${toTitleCase(snap.branch.nameEn)} Branch for the period of ${period}, specifically regarding the ${param.nameEn} portfolio.\n\nA detailed review indicates a significant shortfall in achieving the allocated targets. Against an expected budget of ₹ ${snap.budget?.toLocaleString() || '0'} Cr, the branch has only achieved ₹ ${snap.value.toLocaleString()} Cr. This underperformance is a matter of serious concern for the Management.\n\n[PERFORMANCE_TABLE]\n\nAs the ${headDesignation}, you are requested to analyze the reasons for this shortfall and formulate a concrete, time-bound Action Plan to bridge this gap. You are hereby advised to submit this detailed Plan of Action to the Regional Office within the next 7 days without fail.\n\nWe expect a marked improvement in your branch's performance in the coming weeks. Please treat this matter as highly important.`,
                        branchId: snap.branchId,
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

        res.json({ message: `Generated ${createdLetters.length} letters for ${period}`, letters: createdLetters });
    } catch (error) {
        console.error('Error generating letters:', error);
        res.status(500).json({ error: 'Failed to generate letters' });
    }
});

export default router;
