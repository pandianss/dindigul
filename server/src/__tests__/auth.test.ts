import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

vi.mock('../middleware/auth', () => {
    return {
        authenticateToken: (req: any, _res: any, next: any) => {
            req.user = { id: 'admin-1', role: 'ADMIN', username: 'admin' };
            next();
        },
        requireAdminOrPlanning: (_req: any, _res: any, next: any) => next()
    };
});

vi.mock('../lib/prisma', () => {
    return {
        default: {
            user: {
                create: vi.fn(),
                findUnique: vi.fn(),
                update: vi.fn()
            },
            loginAuditLog: {
                create: vi.fn()
            },
            session: {
                create: vi.fn(),
                findUnique: vi.fn()
            }
        }
    };
});

vi.mock('bcryptjs', () => {
    return {
        default: {
            hash: vi.fn(),
            compare: vi.fn()
        }
    };
});

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('POST /auth/register', () => {
        it('should validate request body and fail if invalid', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send({ username: 'ab' }); // Too short

            expect(res.status).toBe(400);
        });

        it('should create a user when valid', async () => {
            vi.mocked(bcrypt.hash).mockResolvedValue('hashed_pw' as any);
            vi.mocked(prisma.user.create).mockResolvedValue({
                id: 'user-1',
                username: 'testuser'
            } as any);

            const res = await request(app)
                .post('/auth/register')
                .send({
                    username: 'testuser',
                    password: 'password123',
                    fullNameEn: 'Test User',
                    role: 'BRANCH_USER'
                });

            expect(res.status).toBe(200);
            expect(res.body.username).toBe('testuser');
            expect(prisma.user.create).toHaveBeenCalled();
        });
    });

    describe('POST /auth/login', () => {
        it('should reject if user not found', async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

            const res = await request(app)
                .post('/auth/login')
                .send({ username: 'unknown', password: 'password123' }); // Length must be >= 6

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid credentials');
        });

        it('should login successfully if credentials are correct', async () => {
            const mockUser = {
                id: '1',
                username: 'testuser',
                passwordHash: 'hashed',
                role: 'BRANCH_USER',
                mfaEnabled: false,
                isLocked: false
            };
            vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
            vi.mocked(bcrypt.compare).mockResolvedValue(true as any);
            vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);
            vi.mocked(prisma.session.create).mockResolvedValue({} as any);

            const res = await request(app)
                .post('/auth/login')
                .send({ username: 'testuser', password: 'password123' });

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
            expect(res.body.user.username).toBe('testuser');
        });
    });
});
