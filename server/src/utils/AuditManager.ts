import crypto from 'crypto';
import logger from './logger';
import config from '../rules/config.json';

/**
 * Audit and Traceability Manager.
 * Ensures every document generation is logged and verifiable.
 */
export class AuditManager {
    
    /**
     * Records a document generation event.
     */
    static logGeneration(params: {
        branchId: string;
        letterId: string;
        payload: any;
        status: 'SUCCESS' | 'FAILURE';
        error?: string;
    }) {
        const payloadHash = this.hashPayload(params.payload);
        
        logger.info('LETTER_GENERATED', {
            branchId: params.branchId,
            letterId: params.letterId,
            payloadHash,
            templateVersion: config.render.templateVersion,
            timestamp: new Date().toISOString(),
            status: params.status,
            error: params.error
        });
    }

    /**
     * Generates a deterministic SHA-256 hash of a JSON payload.
     */
    static hashPayload(payload: any): string {
        const str = JSON.stringify(payload, Object.keys(payload).sort());
        return crypto.createHash('sha256').update(str).digest('hex');
    }
}
