import { useState, useEffect } from 'react';
import { Notice, fetchNotices, acknowledgeNotice } from '../../services/api/notices';

export function useNotices() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadNotices();
    }, []);

    const loadNotices = async () => {
        try {
            setLoading(true);
            const data = await fetchNotices();
            setNotices(data);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching notices:', err);
            setError(err.message || 'Failed to fetch notices');
        } finally {
            setLoading(false);
        }
    };

    const acknowledge = async (id: string) => {
        try {
            await acknowledgeNotice(id);
            setNotices(prev => prev.map(n =>
                n.id === id ? { ...n, hasAcknowledged: true } : n
            ));
        } catch (err) {
            console.error('Acknowledgement failed:', err);
            throw err;
        }
    };

    return { notices, loading, error, acknowledge, reloadNotices: loadNotices };
}
