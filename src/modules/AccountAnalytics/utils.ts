export const formatNumber = (num: number | string | undefined) => {
    if (num === undefined || num === null) return '0';
    const value = typeof num === 'string' ? parseFloat(num) : num;
    return new Intl.NumberFormat('en-IN').format(value);
};

export const formatCurrency = (amount: number | string | undefined) => {
    if (amount === undefined || amount === null) return '₹0';
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value);
};
