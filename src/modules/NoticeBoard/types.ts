export interface Notice {
    id: string;
    titleEn: string;
    contentEn: string;
    category: string;
    priority: 'NORMAL' | 'URGENT';
    isPinned: boolean;
    requiresAck: boolean;
    hasAcknowledged: boolean;
    createdAt: string;
}
