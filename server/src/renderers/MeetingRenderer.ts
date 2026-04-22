import { HardenedTemplateRenderer } from './HardenedTemplateRenderer';
import { MeetingRepository } from '../infra/MeetingRepository';
import { FactRepository } from '../infra/FactRepository';
import { logger } from '../utils/logger';

/**
 * Hardened Renderer Layer: Meeting Minutes.
 */
export class MeetingRenderer {
    
    /**
     * Renders professional meeting minutes.
     */
    static async renderMinutes(meetingId: string): Promise<string> {
        logger.info('MEETING_RENDER_START', { meetingId });

        try {
            const meeting = await MeetingRepository.getMeetingDetails(meetingId);
            if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

            const signatories = await MeetingRepository.resolveSignatories(meeting.committeeId);
            const signatory = signatories[0];

            // Using the hardened template engine
            return await HardenedTemplateRenderer.render('premiumLayout', {
                metadata: {
                    referenceNo: meeting.title || 'M-PENDING', // meeting doesn't have refNo in schema
                    letterDate: new Date(meeting.date).toLocaleDateString(),
                    generatedAt: new Date(),
                    type: 'MANUAL',
                    category: 'GENERAL',
                    version: 1
                } as any,
                organization: await FactRepository.getRegionalOfficeConfig(),
                recipient: { name: 'Committee Members', isExternal: false },
                signatory: {
                    name: signatory ? { en: signatory.nameEn, hi: signatory.nameHi, ta: signatory.nameTa } : { en: 'Chairman', hi: '', ta: '' },
                    title: signatory ? { en: signatory.designationEn, hi: signatory.designationHi, ta: signatory.designationTa } : { en: 'Committee', hi: '', ta: '' }
                } as any,
                content: {
                    title: { en: meeting.title || 'Meeting Minutes', hi: '', ta: '' },
                    bodyHtml: meeting.minutesJson || ''
                }
            });
        } catch (err: any) {
            logger.error('MEETING_RENDER_FAILURE', err, { meetingId });
            throw err;
        }
    }

    static async buildMinutesHtml(meetingId: string): Promise<string> {
        return await this.renderMinutes(meetingId);
    }
}
