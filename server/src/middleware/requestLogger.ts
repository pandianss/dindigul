import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        }, `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    });

    next();
};
