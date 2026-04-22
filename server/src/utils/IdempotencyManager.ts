import prisma from '../lib/prisma';
import { AuditManager } from './AuditManager';
import { IdempotencyError } from '../types/errors';
import config from '../rules/config.json';

/**
 * Idempotency Control System.
 * Ensures data consistency and prevents duplicate generation side-effects.
 */
export class IdempotencyManager {
    
    /**
     * Checks if a document with the same hash already exists.
     * Guaranteed to return the same result for the same input.
     */
    static async checkAndAcquire(payload: any, letterId: string): Promise<string | null> {
        if (!config.featureFlags.idempotencyCheck) return null;

        const hash = AuditManager.hashPayload(payload);
        
        const existing = await prisma.generationRecord.findUnique({
            where: { payloadHash: hash }
        });

        if (existing) {
            if (existing.letterId !== letterId) {
                throw new IdempotencyError(`Payload conflict: This exact content was already generated for Letter ${existing.letterId}`);
            }
            return existing.fileUrl;
        }

        // Return null to signify that we should proceed with generation
        return null;
    }

    /**
     * Records a successful generation.
     */
    static async recordSuccess(hash: string, letterId: string, fileUrl: string) {
        await prisma.generationRecord.create({
            data: {
                payloadHash: hash,
                letterId,
                fileUrl,
                timestamp: new Date()
            }
        });
    }
}
