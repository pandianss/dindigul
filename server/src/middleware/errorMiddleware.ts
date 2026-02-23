import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';

export class AppError extends Error {
    public readonly errorCode: string;
    public readonly statusCode: number;
    public readonly details?: any;

    constructor(message: string, errorCode: string = 'INTERNAL_ERROR', statusCode: number = 500, details?: any) {
        super(message);
        this.errorCode = errorCode;
        this.statusCode = statusCode;
        this.details = details;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export const errorMiddleware = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const errorCode = err instanceof AppError ? err.errorCode : 'INTERNAL_ERROR';
    const message = err.message || 'An unexpected error occurred';

    // Structured logging of the error
    logger.error({
        errorCode,
        message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        details: err instanceof AppError ? err.details : undefined,
    }, `API Error: ${message}`);

    res.status(statusCode).json({
        errorCode,
        message,
        details: err instanceof AppError ? err.details : undefined,
    });
};
