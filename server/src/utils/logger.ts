/**
 * Production-grade Structured Logger.
 * Ensures auditability and high observability via JSON-compatible output.
 */

export const logger = {
    info: (event: string, metadata: Record<string, any> = {}) => {
        const log = {
            level: 'INFO',
            timestamp: new Date().toISOString(),
            event,
            ...metadata
        };
        console.log(JSON.stringify(log));
    },
    
    error: (event: string, error?: Error | string, metadata: Record<string, any> = {}) => {
        const log = {
            level: 'ERROR',
            timestamp: new Date().toISOString(),
            event,
            error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
            ...metadata
        };
        console.error(JSON.stringify(log));
    },
    
    warn: (event: string, metadata: Record<string, any> = {}) => {
        const log = {
            level: 'WARN',
            timestamp: new Date().toISOString(),
            event,
            ...metadata
        };
        console.warn(JSON.stringify(log));
    },
    
    debug: (event: string, metadata: Record<string, any> = {}) => {
        if (process.env.NODE_ENV !== 'production') {
            const log = {
                level: 'DEBUG',
                timestamp: new Date().toISOString(),
                event,
                ...metadata
            };
            console.debug(JSON.stringify(log));
        }
    }
};

export default logger;
