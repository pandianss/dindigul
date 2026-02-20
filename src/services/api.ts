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

// Add interceptors if needed (e.g., for tokens)
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

export const STATIC_URL = import.meta.env.VITE_STATIC_URL || '/';

export default api;
