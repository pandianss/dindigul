/**
 * Banking-grade Error Taxonomy.
 * Allows for precise error handling and focused observability.
 */

export class AppError extends Error {
    constructor(
        public message: string,
        public code: string,
        public statusCode: number = 500,
        public meta?: Record<string, any>
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, meta?: Record<string, any>) {
        super(message, 'VALIDATION_ERROR', 400, meta);
    }
}

export class MISDataError extends AppError {
    constructor(message: string, meta?: Record<string, any>) {
        super(message, 'MIS_DATA_ERROR', 422, meta);
    }
}

export class PDFRenderError extends AppError {
    constructor(message: string, meta?: Record<string, any>) {
        super(message, 'PDF_RENDER_ERROR', 500, meta);
    }
}

export class AuthError extends AppError {
    constructor(message: string = 'Unauthorized access') {
        super(message, 'AUTH_ERROR', 401);
    }
}

export class NotFoundError extends AppError {
    constructor(entity: string, id?: string) {
        super(`${entity} ${id ? `(${id}) ` : ''}not found`, 'NOT_FOUND', 404);
    }
}

export class IdempotencyError extends AppError {
    constructor(message: string) {
        super(message, 'IDEMPOTENCY_CONFLICT', 409);
    }
}
