import { Router } from 'express';
import { prisma } from '../index';
import { parse } from 'csv-parse/sync';

const router = Router();

interface MISRecord {
    BranchCode: string;
    ParameterCode: string;
    Value: string;
    Budget?: string;
}

// Get latest snapshots for dashboard
router.get('/snapshots', async (req, res) => {
    try {
        const snapshots = await (prisma as any).snapshot.findMany({
            orderBy: { date: 'desc' },
            take: 20,
            include: {
                parameter: true,
                branch: true
            }
        });
        res.json(snapshots);
    } catch (error) {
        console.error('Error fetching snapshots:', error);
        res.status(500).json({ error: 'Failed to fetch snapshots' });
    }
});

// Upload MIS CSV
router.post('/upload', async (req, res) => {
    const { csvData, date } = req.body;

    if (!csvData || !date) {
        return res.status(400).json({ error: 'Missing csvData or date' });
    }

    try {
        const records: MISRecord[] = parse(csvData, {
            columns: true,
            skip_empty_lines: true
        });

        const uploadDate = new Date(date);

        for (const record of records) {
            const { BranchCode, ParameterCode, Value, Budget } = record;

            // Find branch
            const branch = await (prisma as any).branch.findUnique({
                where: { code: BranchCode }
            });

            if (!branch) {
                console.warn(`Branch not found: ${BranchCode}`);
                continue;
            }

            // Find parameter
            const parameter = await (prisma as any).parameter.findUnique({
                where: { code: ParameterCode }
            });

            if (!parameter) {
                console.warn(`Parameter not found: ${ParameterCode}`);
                continue;
            }

            // Upsert snapshot
            await (prisma as any).snapshot.create({
                data: {
                    date: uploadDate,
                    value: parseFloat(Value),
                    budget: Budget ? parseFloat(Budget) : null,
                    parameterId: parameter.id,
                    branchId: branch.id,
                    status: Budget ? (parseFloat(Value) >= parseFloat(Budget) ? 'SURPASSED' : 'LAGGING') : 'POSITIVE'
                }
            });
        }

        res.json({ message: `Successfully processed ${records.length} records.` });
    } catch (error) {
        console.error('Error processing MIS upload:', error);
        res.status(500).json({ error: 'Failed to process MIS upload' });
    }
});

export default router;
