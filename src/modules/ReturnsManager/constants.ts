export const PREMIUM_RATE = 0.0006; // 6 paise per 100
export const GST_RATE = 0.18; // 18% GST

export const PERIODS = [
    { value: '2026-03-31', label: '31 MAR 2026' },
    { value: '2025-09-30', label: '30 SEP 2025' },
    { value: '2025-03-31', label: '31 MAR 2025' },
    { value: '2024-09-30', label: '30 SEP 2024' },
];

export const INITIAL_DICGC_DATA = {
    header: {
        regionalOfficeName: 'Dindigul Regional Office',
        returnDate: '2026-03-31',
    },
    di01: {
        item1: 0, item1a: 0, item1b: 0, item1c: 0, item1d: 0, item1e: 0,
        item2: 0, item3: 0, item4: 0, item5: 0, item6: 0, item7: 0,
        item8: 0, item9: 0, item10: 0, item11: 0, item12: 0,
    },
    item13: {
        bracket1: { bracket: 'Up to ₹ 5.00 Lakh', accountCount: 0, amount: 0 },
        bracket2: { bracket: '₹ 5.00L to ₹ 7.50L', accountCount: 0, amount: 0 },
        bracket3: { bracket: '₹ 7.50L to ₹ 10.00L', accountCount: 0, amount: 0 },
        bracket4: { bracket: 'Over ₹ 10.00 Lakh', accountCount: 0, amount: 0 },
    },
    format1: {
        clearingDifference: 0, clearingNextDay: 0, deposits: 0, ecgcDicgcClaims: 0,
        suitFiledCourt: 0, itStAttachment: 0, tds: 0, excessCash: 0,
        vigilanceCases: 0, others: 0,
    }
};
