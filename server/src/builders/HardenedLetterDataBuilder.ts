import prisma from '../lib/prisma';
import { FactRepository } from '../infra/FactRepository';
import { toUTCDate } from '../utils/businessUtils';
import { logger } from '../utils/logger';
import { 
    UnifiedLetterPayloadSchema, 
    CashDataSchema,
    ValidatedLetterPayload 
} from '../types/schemas';
import { MISDataError, ValidationError } from '../types/errors';
import { SignatoryMetadata, RecipientMetadata } from '../services/interfaces';
import config from '../rules/config.json';

/**
 * Hardened Builder Layer.
 * Guarantees runtime validation and deterministic payload construction.
 */
export class HardenedLetterDataBuilder {
    
    /**
     * Constructs and VALIDATES a Unified Payload.
     * Uses Zod to ensure banking-grade data integrity.
     */
    static async buildFromEntity(letterId: string): Promise<ValidatedLetterPayload> {
        const letter = await prisma.letter.findUnique({
            where: { id: letterId },
            include: {
                branch: true,
                signatory: { include: { designation: true } },
            }
        });

        if (!letter) throw new ValidationError(`Letter ${letterId} not found`);

        const roConfig = await FactRepository.getRegionalOfficeConfig();
        
        // 1. Resolve Recipient
        const recipient: RecipientMetadata = {
            name: letter.recipientName || letter.branch?.nameEn,
            designation: letter.branch?.type,
            branchName: letter.branch?.nameEn,
            branchCode: letter.branch?.code,
            isExternal: letter.isExternal || false,
            address: letter.recipientAddress || undefined,
            salutation: letter.salutation || undefined
        };

        // 2. Resolve Signatory
        const sig = letter.signatory;
        const signatory: SignatoryMetadata = {
            name: {
                en: sig?.fullNameEn || roConfig.bankName.en, // Fallback
                hi: sig?.fullNameHi || roConfig.bankName.hi,
                ta: sig?.fullNameTa || roConfig.bankName.ta
            },
            title: {
                en: sig?.designation?.nameEn || 'Regional Manager',
                hi: sig?.designation?.nameHi || '',
                ta: sig?.designation?.nameTa || ''
            },
            userId: sig?.id
        };

        // 3. FETCH & VALIDATE CASH DATA (STRICT)
        let cashData = undefined;
        if (letter.branchId) {
            try {
                // Resolve the most appropriate date for validation
                let targetDate: Date;
                if (letter.period && /^\d{4}-\d{2}-\d{2}$/.test(letter.period)) {
                    targetDate = toUTCDate(letter.period);
                } else {
                    targetDate = await FactRepository.getLatestBusinessDate();
                }

                logger.info('LETTER_VAL_CASH_START', { letterId, targetDate: targetDate.toISOString(), branchId: letter.branchId });

                const rawCash = await FactRepository.getCashHoldings(letter.branchId, targetDate);
                
                logger.info('LETTER_VAL_CASH_RAW', { letterId, cash: rawCash });

                // Runtime Validation
                cashData = CashDataSchema.parse(rawCash);
            } catch (err: any) {
                logger.error('LETTER_VAL_CASH_FAILURE', err, { letterId });
                if (config.mis.strictValidation) {
                    throw new MISDataError(`MIS Data Integrity Violation for branch ${letter.branchId}`, { originalError: err.message });
                }
            }
        }

        // 4. Assemble Raw Payload
        const rawPayload = {
            metadata: {
                referenceNo: letter.referenceNo || 'PENDING',
                letterDate: new Date(letter.createdAt).toLocaleDateString('en-IN'),
                generatedAt: new Date(),
                type: letter.type as any,
                category: (letter.type === 'APPRECIATION' ? 'APPRECIATION' : (letter.type === 'EXPLANATION' ? 'EXPLANATION' : 'GENERAL')),
                version: letter.version || 1
            },
            organization: {
                bankName: roConfig.bankName,
                officeName: roConfig.officeName,
                address: roConfig.address,
                phone: roConfig.phone || '000-0000000',
                email: roConfig.email || 'ro@bank.com',
                website: 'https://bank.com'
            },
            recipient,
            signatory,
            content: {
                title: { en: letter.titleEn || '', hi: letter.titleHi || '', ta: letter.titleTa || '' },
                bodyHtml: letter.contentEn || ''
            },
            cash: cashData,
            deptSealPath: 'assets/dept_seal.png'
        };

        // 5. FINAL PAYLOAD VALIDATION
        return UnifiedLetterPayloadSchema.parse(rawPayload);
    }
}
