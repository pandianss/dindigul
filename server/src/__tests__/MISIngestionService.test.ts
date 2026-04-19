import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MISIngestionService } from '../services/MISIngestionService';
import xlsx from 'xlsx';
import prisma from '../lib/prisma';

vi.mock('xlsx', () => {
    return {
        default: {
            readFile: vi.fn(),
            utils: {
                sheet_to_json: vi.fn()
            }
        }
    };
});

vi.mock('../services/BusinessSnapshotService', () => {
    return {
        BusinessSnapshotService: {
            populatePanelsBatch: vi.fn()
        }
    };
});

vi.mock('../services/RuleEngine', () => {
    return {
        RuleEngine: {
            evaluateBatch: vi.fn()
        }
    };
});

vi.mock('../lib/prisma', () => {
    return {
        default: {
            misImportLog: {
                create: vi.fn(),
                update: vi.fn()
            },
            branch: {
                findMany: vi.fn(),
            },
            parameter: {
                findMany: vi.fn(),
            },
            snapshot: {
                upsert: vi.fn()
            },
            $transaction: vi.fn()
        }
    };
});

describe('MISIngestionService', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should create an import log and process rows', async () => {
        const mockSheet = {};
        vi.mocked(xlsx.readFile).mockReturnValue({
            SheetNames: ['Sheet1'],
            Sheets: { 'Sheet1': mockSheet }
        } as any);

        vi.mocked(xlsx.utils.sheet_to_json).mockReturnValue([
            { SOL: '1234', DATE: '20240321', MUDRA: 100 }
        ]);

        vi.mocked(prisma.misImportLog.create).mockResolvedValue({ id: 'log-1' } as any);
        vi.mocked(prisma.branch.findMany).mockResolvedValue([{ id: 'branch-1', code: '1234', type: 'BRANCH' }] as any);
        vi.mocked(prisma.parameter.findMany).mockResolvedValue([] as any);
        vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
            return callback({
                ingestionLog: { create: vi.fn().mockResolvedValue({ id: 'ingestion-1' }) },
                misParameterRegistry: { 
                    findMany: vi.fn().mockResolvedValue([]),
                    create: vi.fn().mockResolvedValue({})
                },
                parameter: { upsert: vi.fn().mockResolvedValue({ id: 'param-1', code: 'MUDRA' }) },
                budgetMaster: { findFirst: vi.fn().mockResolvedValue(null) },
                snapshot: {
                    findFirst: vi.fn().mockResolvedValue(null),
                    create: vi.fn(),
                    update: vi.fn()
                },
                fact: { deleteMany: vi.fn(), createMany: vi.fn() },
                misSnapshot: { upsert: vi.fn().mockResolvedValue({ id: 'snapshot-1', unitId: 'branch-1' }) }
            });
        });

        await MISIngestionService.processExcel('dummy.xlsx', 'dummy.xlsx');

        expect(xlsx.readFile).toHaveBeenCalledWith('dummy.xlsx');
        expect(prisma.misImportLog.create).toHaveBeenCalled();
        expect(prisma.branch.findMany).toHaveBeenCalled();
        expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should handle rows with missing SOL or Date gracefully', async () => {
        const mockSheet = {};
        vi.mocked(xlsx.readFile).mockReturnValue({
            SheetNames: ['Sheet1'],
            Sheets: { 'Sheet1': mockSheet }
        } as any);

        vi.mocked(xlsx.utils.sheet_to_json).mockReturnValue([
            { SOL: '', DATE: '20240321', MUDRA: 100 } // Missing SOL
        ]);

        vi.mocked(prisma.misImportLog.create).mockResolvedValue({ id: 'log-1' } as any);
        vi.mocked(prisma.branch.findMany).mockResolvedValue([] as any);
        vi.mocked(prisma.parameter.findMany).mockResolvedValue([] as any);

        await MISIngestionService.processExcel('dummy.xlsx', 'dummy.xlsx');

        expect(prisma.branch.findMany).toHaveBeenCalled();
        expect(prisma.$transaction).toHaveBeenCalled();
    });
});
