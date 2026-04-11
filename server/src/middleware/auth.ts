import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('[FATAL] JWT_SECRET environment variable is not set. Refusing to start.');
    process.exit(1);
}

interface AuthRequest extends Request {
    user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (process.env.DEBUG_AUTH === 'true') {
        console.log(`[AuthMiddleware] ${req.method} ${req.path} - Token present:`, !!token);
    }

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET as string, async (err: any, user: any) => {
        if (err) {
            console.error(`[Auth] JWT Verification failed:`, err.name);
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Session expired. Please log in again.' });
            }
            return res.status(403).json({ error: 'Invalid token' });
        }
        // Explicit session check
        const session = await prisma.session.findUnique({
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

// Reusable middleware: allows ADMIN or Planning section RO_USER
export const requireAdminOrPlanning = (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const isPlanningRole = user?.role === 'RO_USER' && user?.section === 'Planning';
    if (user?.role !== 'ADMIN' && !isPlanningRole) {
        return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
};
