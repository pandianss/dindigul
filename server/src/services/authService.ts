import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { config } from '../lib/config';
import { User, JWTPayload } from '../types/auth';

export class AuthService {
    static async findUserByUsername(username: string): Promise<User | null> {
        return prisma.user.findUnique({ where: { username } }) as Promise<User | null>;
    }

    static async findUserById(id: string): Promise<User | null> {
        return prisma.user.findUnique({ where: { id } }) as Promise<User | null>;
    }

    static isLocked(user: User): boolean {
        if (!user.lockedUntil) return false;
        return new Date(user.lockedUntil) > new Date();
    }

    static getLockoutMinutesLeft(user: User): number {
        if (!user.lockedUntil) return 0;
        return Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
    }

    static async incrementFailedAttempts(username: string, currentAttempts: number): Promise<void> {
        const attempts = currentAttempts + 1;
        const updateData: any = { failedLoginAttempts: attempts };
        if (attempts >= config.maxFailedAttempts) {
            updateData.lockedUntil = new Date(Date.now() + config.lockoutMinutes * 60 * 1000);
        }
        await prisma.user.update({ where: { username }, data: updateData });
    }

    static async resetFailedAttempts(username: string): Promise<void> {
        await prisma.user.update({
            where: { username },
            data: { failedLoginAttempts: 0, lockedUntil: null }
        });
    }

    static generateToken(payload: JWTPayload, expiresIn: string = '8h'): string {
        return jwt.sign(payload, config.jwtSecret, { expiresIn });
    }

    static verifyToken(token: string): JWTPayload {
        return jwt.verify(token, config.jwtSecret) as JWTPayload;
    }
}
