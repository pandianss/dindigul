import axios from 'axios';

// The base URL defaults to the relative /api path if VITE_API_URL is not provided, 
// which is useful when served by NGINX or Express directly.
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add interceptors for tokens
api.interceptors.request.use((config) => {
    const user = localStorage.getItem('user');
    if (user) {
        const { token } = JSON.parse(user);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Response interceptor for session expiry
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export const STATIC_URL = import.meta.env.VITE_STATIC_URL || '/';

/**
 * Robustly joins STATIC_URL with a path to ensure absolute URLs are formed correctly.
 * Useful for resolving image paths from the backend.
 */
export const getStaticUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;

    // Ensure STATIC_URL doesn't end with slash and path doesn't start with one
    const base = STATIC_URL.replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');

    // If STATIC_URL is just empty or '/', we return the relative path
    if (!base) return `/${cleanPath}`;

    return `${base}/${cleanPath}`;
};

export default api;
