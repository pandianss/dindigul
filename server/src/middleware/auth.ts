import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

interface AuthRequest extends Request {
    user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log(`[AuthMiddleware] ${req.method} ${req.path} - Token present:`, !!token);

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
        if (err) {
            console.error(`[Auth] JWT Verification failed:`, err.name);
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Session expired. Please log in again.' });
            }
            return res.status(403).json({ error: 'Invalid token' });
        }

        // GAP: Explicit session check
        const session = await (prisma as any).session.findUnique({
            where: { token, isActive: true }
        });

        if (!session || new Date() > session.expiresAt) {
            console.warn(`[Auth] Inactive or expired session for user ${user.username}`);
            return res.status(401).json({ error: 'Session invalidated' });
        }

        req.user = user;
        next();
    });
};
