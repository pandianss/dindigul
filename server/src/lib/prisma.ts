import { PrismaClient } from '../generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Ensure environment variables are loaded from the root .env or server .env
const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'server', '.env'),
    path.join(__dirname, '../../.env'),
    path.join(__dirname, '../../../../.env')
];

for (const p of envPaths) {
    dotenv.config({ path: p });
}

const dbUrl = process.env.DATABASE_URL || '';
// Manually parse connection string to ensure all credentials are strings
// and avoid the "SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string" error
const parseConnectionString = (url: string) => {
  try {
    const parsed = new URL(url);
    return {
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432'),
      database: decodeURIComponent(parsed.pathname.split('/')[1] || ''),
    };
  } catch (e) {
    console.warn('Failed to parse DATABASE_URL via URL API, falling back to connectionString');
    return { connectionString: url };
  }
};

const poolConfig = {
  ...parseConnectionString(dbUrl),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

const pool = new Pool(poolConfig);
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export default prisma;
