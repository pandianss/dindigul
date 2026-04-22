import prisma from '../lib/prisma';

export type NotificationType = 'INFO' | 'ALERT' | 'SUCCESS' | 'ERROR';

/**
 * Infrastructure Layer: Low-level notification delivery (Persistence).
 */
export class NotificationService {
    static async create(userId: string, title: string, message: string, type: NotificationType = 'INFO', link?: string) {
        try {
            return await prisma.notification.create({
                data: { userId, title, message, type, link }
            });
        } catch (err) {
            console.error('Failed to create notification:', err);
        }
    }

    static async notifyAdmins(title: string, message: string, link?: string) {
        try {
            const admins = await prisma.user.findMany({
                where: { role: 'ADMIN' }
            });

            await Promise.all(admins.map(admin =>
                this.create(admin.id, title, message, 'ALERT', link)
            ));
        } catch (err) {
            console.error('Failed to notify admins:', err);
        }
    }
    static async createNotification(userId: string, title: string, message: string, type: NotificationType = 'INFO', link?: string) {
        return await this.create(userId, title, message, type, link);
    }
}
