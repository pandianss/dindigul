import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateToken } from '../middleware/auth';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

vi.mock('jsonwebtoken');
vi.mock('../lib/prisma', () => {
    return {
        default: {
            session: {
                findUnique: vi.fn(),
            },
        },
    };
});

describe('authenticateToken middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        mockReq = {
            headers: {}
        };
        nextFunction = vi.fn();
        vi.resetAllMocks();
    });

    it('should return 401 if no authorization header is present', async () => {
        const res: any = {};
        res.status = vi.fn().mockReturnValue(res);
        res.json = vi.fn().mockReturnValue(res);
        res.sendStatus = vi.fn().mockReturnValue(res);
        await authenticateToken(mockReq as Request, res as Response, nextFunction);
        expect(res.sendStatus).toHaveBeenCalledWith(401);
    });

    it('should return 403 if token is invalid', async () => {
        mockReq.headers = { authorization: 'Bearer invalid_token' };
        vi.mocked(jwt.verify).mockImplementation((token, secret, callback: any) => {
            callback(new Error('Invalid token'), null);
        });

        const res: any = {};
        res.status = vi.fn().mockReturnValue(res);
        res.json = vi.fn().mockReturnValue(res);
        res.sendStatus = vi.fn().mockReturnValue(res);

        await authenticateToken(mockReq as Request, res as Response, nextFunction);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    it('should call next if token is valid and session exists', async () => {
        mockReq.headers = { authorization: 'Bearer valid_token' };
        const mockUser = { id: 1, username: 'test' };

        vi.mocked(jwt.verify).mockImplementation((token, secret, callback: any) => {
            callback(null, mockUser);
        });

        vi.mocked(prisma.session.findUnique).mockResolvedValue({
            id: 'session-id',
            userId: 'user-id',
            token: 'valid_token',
            isActive: true,
            expiresAt: new Date(Date.now() + 100000), // future date
            createdAt: new Date(),
        } as any);

        const res: any = {};
        res.status = vi.fn().mockReturnValue(res);
        res.json = vi.fn().mockReturnValue(res);
        res.sendStatus = vi.fn().mockReturnValue(res);

        await authenticateToken(mockReq as Request, res as Response, nextFunction);

        expect((mockReq as any).user).toEqual(mockUser);
        expect(nextFunction).toHaveBeenCalled();
    });
});
