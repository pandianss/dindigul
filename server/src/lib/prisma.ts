import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Ensure environment variables are loaded from the root .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const dbUrl = process.env.DATABASE_URL || '';
const redactedUrl = dbUrl.replace(/:([^@]+)@/, ':****@');
console.log(`Initialising Prisma with URL: ${redactedUrl}`);

const prisma = new PrismaClient({
    log: ['error', 'warn', 'query'],
    datasources: {
        db: {
            url: dbUrl
        }
    }
});

export default prisma;
