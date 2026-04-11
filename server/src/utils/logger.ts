/**
 * Centrialized logging utility for the Dindigul server.
 * This ensures consistent log formats and allows for easy integration 
 * with external logging services in the future.
 */

type LogArgs = any[];

export const logger = {
    info: (message: string, ...args: LogArgs) => {
        console.log(`[INFO] [${new Date().toISOString()}] ${message}`, ...args);
    },
    
    error: (message: string, error?: any, ...args: LogArgs) => {
        console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, error || '', ...args);
    },
    
    warn: (message: string, ...args: LogArgs) => {
        console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, ...args);
    },
    
    debug: (message: string, ...args: LogArgs) => {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(`[DEBUG] [${new Date().toISOString()}] ${message}`, ...args);
        }
    }
};

export default logger;
