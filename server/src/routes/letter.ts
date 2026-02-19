import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// Get all letters
router.get('/', async (req, res) => {
    try {
        const { branchId, type } = req.query;
        const letters = await (prisma as any).letter.findMany({
            where: {
                ...(branchId ? { branchId: String(branchId) } : {}),
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
router.patch('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const letter = await (prisma as any).letter.update({
            where: { id },
            data: { status }
        });
        res.json(letter);
    } catch (error) {
        console.error('Error updating letter status:', error);
        res.status(500).json({ error: 'Failed to update letter status' });
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

        const topBranches = snapshots.slice(0, 3);
        const bottomBranches = snapshots.slice(-3).reverse();

        const createdLetters = [];

        // Generate Appreciation Letters
        for (const snap of topBranches) {
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

        // Generate Explanation Letters
        for (const snap of bottomBranches) {
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

        res.json({ message: `Generated ${createdLetters.length} letters for ${period}`, letters: createdLetters });
    } catch (error) {
        console.error('Error generating letters:', error);
        res.status(500).json({ error: 'Failed to generate letters' });
    }
});

export default router;
