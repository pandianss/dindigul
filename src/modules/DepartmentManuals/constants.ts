export const FREQUENCY_CONFIG: Record<string, { label: string, color: string, bg: string }> = {
    'DAILY': { label: 'Daily', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
    'WEEKLY': { label: 'Weekly', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
    'MONTHLY': { label: 'Monthly', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-100' },
    'QUARTERLY': { label: 'Quarterly', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
    'HALF_YEARLY': { label: 'Half Yearly', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
    'YEARLY': { label: 'Yearly', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-100' },
    'ADHOC': { label: 'Ad-hoc', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-100' },
};

export const QUILL_MODULES = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'image'],
        ['clean']
    ],
};

export const QUILL_FORMATS = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link', 'image'
];
