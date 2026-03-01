import { Router } from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';
import { createNotification } from '../services/notificationService';

const router = Router();

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
                branch: true,
                parameter: true
            }
        });
        res.json(letters);
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
            include: { branch: true }
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

        const createdLetters = [];

        // Generate Appreciation Letters
        for (const snap of topBranches) {
            const existingLetter = await (prisma as any).letter.findFirst({
                where: { branchId: snap.branchId, period: period, type: 'APPRECIATION' }
            });

            if (!existingLetter) {
                const letter = await (prisma as any).letter.create({
                    data: {
                        type: 'APPRECIATION',
                        titleEn: `Appreciation Letter - ${period}`,
                        contentEn: `Congratulations to ${snap.branch.nameEn} for outstanding performance in Total Deposits for ${period}. Your achievement of ₹ ${snap.value.toLocaleString()} Cr is highly commendable.`,
                        branchId: snap.branchId,
                        parameterId: param.id,
                        valueAtTime: snap.value,
                        budgetAtTime: snap.budget,
                        period: period
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
                const letter = await (prisma as any).letter.create({
                    data: {
                        type: 'EXPLANATION',
                        titleEn: `Explanation Letter - ${period}`,
                        contentEn: `Performance review for ${snap.branch.nameEn} in Total Deposits for ${period} shows a shortfall. Your achievement was ₹ ${snap.value.toLocaleString()} Cr against expected targets. Please submit an explanation by end of week.`,
                        branchId: snap.branchId,
                        parameterId: param.id,
                        valueAtTime: snap.value,
                        budgetAtTime: snap.budget,
                        period: period
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
