import prisma from '../lib/prisma';

export const DashboardService = {
    getSummary: async () => {
        return { message: 'MOCK' };
    },
    getRegionalPerformance: async () => {
        return [];
    },
    getConfig: async () => {
        return {};
    },
    updateSrmMessage: async (data: any) => {
        return data;
    },
    addTicker: async (data: any) => {
        return data;
    },
    updateTicker: async (id: string, data: any) => {
        return data;
    },
    deleteTicker: async (id: string) => {
        return true;
    },
    getAdminTickers: async () => {
        return [];
    }
};
