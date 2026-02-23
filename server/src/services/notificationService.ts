import { prisma } from '../index';

export type NotificationType = 'INFO' | 'ALERT' | 'SUCCESS' | 'ERROR';

export const createNotification = async (
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'INFO',
    link?: string
) => {
    try {
        const notification = await (prisma as any).notification.create({
            data: {
                userId,
                title,
                message,
                type,
                link
            }
        });
        return notification;
    } catch (err) {
        console.error('Failed to create notification:', err);
    }
};

export const notifyAdmins = async (title: string, message: string, link?: string) => {
    try {
        const admins = await (prisma as any).user.findMany({
            where: { role: 'ADMIN' }
        });

        await Promise.all(admins.map((admin: any) =>
            createNotification(admin.id, title, message, 'ALERT', link)
        ));
    } catch (err) {
        console.error('Failed to notify admins:', err);
    }
};
