import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL'];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        if (process.env.NODE_ENV !== 'test') {
            console.error(`FATAL: Missing mandatory environment variable: ${envVar}`);
            process.exit(1);
        } else {
            console.warn(`WARN: Missing mandatory environment variable in test mode: ${envVar}`);
        }
    }
}

export const config = {
    port: process.env.PORT || 5000,
    jwtSecret: process.env.JWT_SECRET as string,
    frontendUrl: process.env.FRONTEND_URL as string,
    databaseUrl: process.env.DATABASE_URL as string,
    maxFailedAttempts: 5,
    lockoutMinutes: 15,
};
