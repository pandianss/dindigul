import api from '../api';

export interface Notice {
    id: string;
    titleEn: string;
    contentEn: string;
    category: string;
    priority: string;
    isPinned: boolean;
    createdAt: string;
    requiresAck: boolean;
    hasAcknowledged: boolean;
}

export const fetchNotices = async (): Promise<Notice[]> => {
    const response = await api.get('/notices');
    return response.data;
};

export const acknowledgeNotice = async (id: string): Promise<void> => {
    await api.post(`/notices/${id}/ack`);
};
