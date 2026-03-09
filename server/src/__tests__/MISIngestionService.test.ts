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

vi.mock('../lib/prisma', () => {
    return {
        default: {
            misImportLog: {
                create: vi.fn(),
                update: vi.fn()
            },
            branch: {
                findUnique: vi.fn(),
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
        vi.mocked(prisma.branch.findUnique).mockResolvedValue({ id: 'branch-1', code: '1234' } as any);
        vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
            return callback({
                ingestionLog: { create: vi.fn().mockResolvedValue({ id: 'ingestion-1' }) },
                fact: { deleteMany: vi.fn(), createMany: vi.fn() }
            });
        });

        await MISIngestionService.processExcel('dummy.xlsx', 'dummy.xlsx');

        expect(xlsx.readFile).toHaveBeenCalledWith('dummy.xlsx');
        expect(prisma.misImportLog.create).toHaveBeenCalled();
        expect(prisma.branch.findUnique).toHaveBeenCalledWith({ where: { code: '1234' } });
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

        await MISIngestionService.processExcel('dummy.xlsx', 'dummy.xlsx');

        expect(prisma.branch.findUnique).not.toHaveBeenCalled();
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });
});
