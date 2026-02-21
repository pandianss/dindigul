import { AxiosError } from 'axios';

export function getErrorMessage(error: unknown): string {
    if (error instanceof AxiosError) {
        if (error.response?.status === 401) return 'Session expired. Please log in again.';
        if (error.response?.status === 403) return 'You do not have permission to perform this action.';
        if (error.response?.status === 404) return 'The requested resource was not found.';
        return error.response?.data?.message || error.response?.data?.error || 'Server error. Please try again.';
    }
    if (error instanceof Error) return error.message;
    return 'An unexpected error occurred.';
}
