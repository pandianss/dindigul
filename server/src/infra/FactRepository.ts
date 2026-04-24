import prisma from '../lib/prisma';
import { toUTCDate } from '../utils/businessUtils';

/**
 * Infrastructure Layer: Low-level data access for MIS facts and snapshots.
 */
export class FactRepository {
    static async getLatestBusinessDate(): Promise<Date> {
        const latest = await prisma.fact.findFirst({
            orderBy: { date: 'desc' },
            select: { date: true }
        });
        return latest?.date || toUTCDate(new Date());
    }

    /**
     * Fetches current cash holdings for a branch on a specific date (or the latest available).
     */
    static async getCashHoldings(branchId: string, targetDate: Date) {
        const metrics = ['CASH_TOTAL', 'CASH_CRL', 'CASH_EXCESS', 'CASH_BNA', 'CASH_HAND', 'CASH_ATM', 'CASH_BC'];
        
        const facts = await prisma.fact.findMany({
            where: {
                unitId: branchId,
                date: targetDate,
                metric: { in: metrics }
            }
        });

        // Map facts to a clean object with explicit number casting for Zod
        const find = (m: string) => Number(facts.find(f => f.metric === m)?.value || 0);

        return {
            totalCashOnHand: find('CASH_TOTAL'),
            retentionLimit: find('CASH_CRL'),
            excessCash: find('CASH_EXCESS'),
            bnaCash: find('CASH_BNA'),
            atmCash: find('CASH_ATM'),
            bcCash: find('CASH_BC'),
            asOfDate: targetDate
        };
    }

    /**
     * Fetches facts for multiple metrics across two dates for comparison.
     */
    static async getTrendData(branchId: string, current: Date, previous: Date, metrics: string[]) {
        const facts = await prisma.fact.findMany({
            where: {
                unitId: branchId,
                date: { in: [current, previous] },
                metric: { in: metrics }
            }
        });

        const map: Record<string, Record<string, number>> = {};
        map[current.toISOString()] = {};
        map[previous.toISOString()] = {};

        facts.forEach(f => {
            const dateKey = f.date.toISOString();
            if (map[dateKey]) {
                map[dateKey][f.metric] = Number(f.value);
            }
        });

        return {
            current: map[current.toISOString()],
            previous: map[previous.toISOString()]
        };
    }

    /**
     * Fetches trilingual signatory data for the RO or a specific user.
     */
    static async getRegionalOfficeConfig(): Promise<{
        bankName: { en: string; hi: string; ta: string };
        officeName: { en: string; hi: string; ta: string };
        address: { en: string; hi: string; ta: string };
        phone: string;
        email: string;
        website: string;
        signatoryName: string;
        signingAuthEn: string;
        signingAuthHi: string;
        signingAuthTa: string;
    }> {
        const ro = await prisma.branch.findUnique({ where: { code: '3933' } });
        const config = await prisma.organizationConfig.findUnique({ where: { id: 'singleton' } });

        return {
            bankName: {
                en: config?.bankNameEn || 'Indian Overseas Bank',
                hi: config?.bankNameHi || 'इंडियन ओवरसीज बैंक',
                ta: config?.bankNameTa || 'இந்தியன் ஓவர்சீஸ் வங்கி'
            },
            officeName: {
                en: ro?.nameEn || 'Regional Office, Dindigul',
                hi: ro?.nameHi || 'क्षेत्रीय कार्यालय, डिंडीगुल',
                ta: ro?.nameTa || 'மண்டல அலுவலகம், திண்டுக்கல்'
            },
            address: {
                en: ro?.address1En || '',
                hi: ro?.address1Hi || '',
                ta: ro?.address1Ta || ''
            },
            phone: ro?.phone || '+91 451 2420000',
            email: ro?.email || 'ro.dindigul@iob.in',
            website: 'www.iob.in',
            signatoryName: config?.signatoryName || 'Regional Manager',
            signingAuthEn: config?.signingAuthEn || 'Regional Manager',
            signingAuthHi: config?.signingAuthHi || 'क्षेत्रीय प्रबंधक',
            signingAuthTa: config?.signingAuthTa || 'மண்டல மேலாளர்'
        };
    }
}
