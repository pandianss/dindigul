import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../services/authService';
import prisma from '../lib/prisma';

vi.mock('../lib/prisma', () => ({
    default: {
        user: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
    },
}));

describe('AuthService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('isLocked', () => {
        it('should return true if lockedUntil is in the future', () => {
            const lockedUntil = new Date(Date.now() + 10000);
            const user = { lockedUntil } as any;
            expect(AuthService.isLocked(user)).toBe(true);
        });

        it('should return false if lockedUntil is in the past', () => {
            const lockedUntil = new Date(Date.now() - 10000);
            const user = { lockedUntil } as any;
            expect(AuthService.isLocked(user)).toBe(false);
        });

        it('should return false if lockedUntil is null', () => {
            const user = { lockedUntil: null } as any;
            expect(AuthService.isLocked(user)).toBe(false);
        });
    });

    describe('incrementFailedAttempts', () => {
        it('should increment failed attempts and lock account if limit reached', async () => {
            const username = 'testuser';
            const currentAttempts = 4;

            await AuthService.incrementFailedAttempts(username, currentAttempts);

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { username },
                data: {
                    failedLoginAttempts: 5,
                    lockedUntil: expect.any(Date),
                },
            });
        });

        it('should only increment failed attempts if limit not reached', async () => {
            const username = 'testuser';
            const currentAttempts = 2;

            await AuthService.incrementFailedAttempts(username, currentAttempts);

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { username },
                data: {
                    failedLoginAttempts: 3,
                },
            });
        });
    });

    describe('resetFailedAttempts', () => {
        it('should reset failed attempts and unlock account', async () => {
            const username = 'testuser';

            await AuthService.resetFailedAttempts(username);

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { username },
                data: {
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                },
            });
        });
    });
});
