export function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}

export const prepareChartData = (dailyData: any[]) => {
    return dailyData.reduce((acc: any[], curr: any) => {
        const date = new Date(curr.date);
        const dateStr = `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
        const existing = acc.find(d => d.date === dateStr);
        if (existing) {
            existing.value += curr.value;
        } else {
            acc.push({ date: dateStr, value: curr.value });
        }
        return acc;
    }, []);
};

export const calculateDistributionWeight = (targetValue: number, branches: any[], typeWeights: Record<string, number>) => {
    if (targetValue <= 0) return {};

    const branchWeights = branches.map(b => ({
        id: b.id,
        weight: typeWeights[b.type] || 1
    }));
    const totalWeight = branchWeights.reduce((sum, bw) => sum + bw.weight, 0);

    if (totalWeight <= 0) return {};

    const newTargets: Record<string, number> = {};
    let allocatedSoFar = 0;

    branchWeights.forEach((bw, index) => {
        let share = Math.floor((bw.weight / totalWeight) * targetValue);
        if (index === branchWeights.length - 1) {
            share = targetValue - allocatedSoFar;
        }
        newTargets[bw.id] = share;
        allocatedSoFar += share;
    });

    return newTargets;
};
