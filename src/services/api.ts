import axios from 'axios';
import i18n from '../i18n';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Inject Token
api.interceptors.request.use((config) => {
    const user = localStorage.getItem('user');
    if (user) {
        try {
            const { token } = JSON.parse(user);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (e) {
            console.error('Failed to parse user from localStorage', e);
        }
    }
    return config;
});

// Response Interceptor: Global Error Handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const { response } = error;

        if (response) {
            // Handle Auth Failures
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('user');
                // Optional: window.location.href = '/'; 
                // Better to let the AuthContext handle this if possible
            }

            // Map backend errorCode to localized message
            const errorCode = response.data?.errorCode;
            if (errorCode) {
                error.message = i18n.t(`errors.${errorCode}`, response.data.message);
            }
        }

        return Promise.reject(error);
    }
);

export const STATIC_URL = import.meta.env.VITE_STATIC_URL || '/';

export default api;
