import api from '../../services/api';
import { format } from 'date-fns';
import { getErrorMessage } from '../../utils/handleError';

export const handleDownloadPDF = async (id: string, name: string) => {
    try {
        const response = await api.get(`/meetings/${id}/pdf`, {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Meeting_Minutes_${name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        alert('Failed to download PDF: ' + getErrorMessage(error));
    }
};
