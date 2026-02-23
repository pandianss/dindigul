import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../lib/config';
import { JWTPayload } from '../types/auth';

interface AuthRequest extends Request {
    user?: JWTPayload;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, config.jwtSecret, (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.user = user as JWTPayload;
        next();
    });
};
