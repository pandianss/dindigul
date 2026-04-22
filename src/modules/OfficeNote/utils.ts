export const calcInterestBI = (
    principal: string | number,
    effectiveRate: string | number,
    days: string | number,
    freq: string
): string => {
    const p = parseFloat(String(principal)) || 0;
    const r = parseFloat(String(effectiveRate)) || 0;
    const d = parseFloat(String(days)) || 0;
    if (p <= 0 || r <= 0 || d <= 0) return '';
    const rDec = r / 100;
    if (freq === 'SIMPLE') {
        // Simple interest: P x R x D / 365 (per RBI Para 2.3)
        return (p * rDec * d / 365).toFixed(2);
    }
    // Compound interest: A = P x (1 + r/n)^(n x t), Interest = A - P
    // t is in years = D / 365
    const n = freq === 'MONTHLY' ? 12 : freq === 'QUARTERLY' ? 4 : freq === 'HALFYEARLY' ? 2 : 1;
    const t = d / 365;
    const maturity = p * Math.pow(1 + rDec / n, n * t);
    return (maturity - p).toFixed(2);
};
