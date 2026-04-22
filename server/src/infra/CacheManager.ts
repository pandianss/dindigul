/**
 * Production-grade Caching Layer.
 * In-memory implementation with a Redis-compatible interface.
 */
export class CacheManager {
    private static instance: CacheManager;
    private cache: Map<string, { value: any; expiry: number }>;

    private constructor() {
        this.cache = new Map();
    }

    public static getInstance(): CacheManager {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }

    /**
     * Stores a value in the cache with a specific TTL (Time To Live).
     */
    public set(key: string, value: any, ttlSeconds: number = 3600): void {
        const expiry = Date.now() + ttlSeconds * 1000;
        this.cache.set(key, { value, expiry });
    }

    /**
     * Retrieves a value from the cache. Returns null if expired or missing.
     */
    public get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }

        return entry.value as T;
    }

    public delete(key: string): void {
        this.cache.delete(key);
    }

    public clear(): void {
        this.cache.clear();
    }
}
