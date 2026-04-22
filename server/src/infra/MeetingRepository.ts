import prisma from '../lib/prisma';

/**
 * Infrastructure Layer: Data access for Committees and Meetings.
 */
export class MeetingRepository {
    
    static async getCommittees() {
        return await prisma.committee.findMany({
            orderBy: { nameEn: 'asc' }
        });
    }

    static async getMeetings(committeeId: string) {
        return await prisma.meeting.findMany({
            where: committeeId === 'GENERAL' ? { committeeId: null } : { committeeId },
            orderBy: { date: 'desc' },
            include: { committee: true }
        });
    }

    static async createMeeting(data: any) {
        return await prisma.meeting.create({
            data: {
                committeeId: data.committeeId === 'GENERAL' ? null : (data.committeeId || null),
                title: data.title || (data.committeeId === 'GENERAL' ? 'Meeting' : null),
                date: new Date(data.date),
                venue: data.venue || 'Dindigul',
                attendees: data.attendees || [],
                signatories: data.signatories || [],
                status: data.status || 'DRAFT',
                minutesJson: data.minutes ? JSON.stringify(data.minutes) : JSON.stringify([])
            }
        });
    }

    static async updateMeeting(id: string, data: any) {
        return await prisma.meeting.update({
            where: { id },
            data: {
                committeeId: data.committeeId === 'GENERAL' ? null : (data.committeeId || undefined),
                title: data.title !== undefined ? data.title : undefined,
                date: data.date ? new Date(data.date) : undefined,
                venue: data.venue || undefined,
                attendees: data.attendees || undefined,
                signatories: data.signatories || undefined,
                status: data.status || undefined,
                minutesJson: data.minutes ? JSON.stringify(data.minutes) : undefined
            }
        });
    }

    static async getMeetingDetails(id: string) {
        return await prisma.meeting.findUnique({
            where: { id },
            include: { committee: true }
        });
    }

    static async resolveSignatories(committeeId: string | null) {
        return [
            await this.resolveMember('Regional Manager'),
            await this.resolveMember('Officer-in-charge')
        ];
    }

    /**
     * Resolves staff details from Name or ID.
     */
    static async resolveMember(identifier: string) {
        if (!identifier) return null;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let user = null;

        if (uuidRegex.test(identifier)) {
            user = await prisma.user.findUnique({ where: { id: identifier } });
        } else {
            user = await prisma.user.findFirst({ where: { fullNameEn: identifier } });
        }

        return {
            nameEn: user?.fullNameEn || identifier,
            nameHi: user?.fullNameHi || '',
            nameTa: user?.fullNameTa || '',
            designationEn: user?.designationEn || 'Official',
            designationHi: user?.designationHi || '',
            designationTa: user?.designationTa || ''
        };
    }
}
