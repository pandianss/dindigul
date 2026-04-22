import { format } from 'date-fns';
import { parseLocalISO } from '../../utils/dateUtils';
import { Letter } from './types';

export const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
};

export const getSelectedPeriodLabel = (selectedDate: string) => {
    const dateObj = parseLocalISO(selectedDate) || new Date();
    return format(dateObj, 'MMM yyyy');
};

export const getSelectedCycleLabel = (activeTab: string, selectedDate: string) => {
    if (activeTab === 'OP_RISK') {
        const dateObj = parseLocalISO(selectedDate) || new Date();
        return format(dateObj, 'dd.MM.yyyy');
    }
    if (activeTab === 'PERFORMANCE') {
        return getSelectedPeriodLabel(selectedDate);
    }
    return null;
};

export const isLetterInActiveCategory = (letter: Letter, activeTab: string) => {
    if (activeTab === 'PERFORMANCE') return letter.type === 'APPRECIATION' || letter.type === 'EXPLANATION';
    if (activeTab === 'OP_RISK') return letter.type === 'OP_RISK';
    if (activeTab === 'BUDGET') return letter.type === 'BUDGET_ALLOTMENT';
    if (activeTab === 'MANUAL') return letter.type === 'MANUAL';
    return false;
};

export const isLetterInSelectedCycle = (letter: Letter, activeTab: string, selectedDate: string) => {
    const cycle = getSelectedCycleLabel(activeTab, selectedDate);
    if (!cycle) return true;
    return letter.period === cycle;
};
