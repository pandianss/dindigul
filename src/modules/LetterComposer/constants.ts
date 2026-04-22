export const QUILL_MODULES = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        ['link', 'image', 'table'],
        ['clean']
    ],
};

export const LANGUAGES = [
    { code: 'EN', label: 'ENGLISH', icon: 'Globe' },
    { code: 'HI', label: 'हिन्दी', icon: 'Languages', font: 'font-hindi' },
    { code: 'TA', label: 'தமிழ்', icon: 'Languages', font: 'font-tamil' },
] as const;

export const EDITOR_STYLES = `
    .quill { display: flex; flex-direction: column; height: 100%; border: 1px solid #f3f4f6 !important; border-radius: 12px; overflow: hidden; background: white; }
    .ql-toolbar { border: none !important; border-bottom: 1px solid #f3f4f6 !important; background: #f9fafb; sticky: top; z-index: 10; padding: 10px !important; }
    .ql-container { border: none !important; flex-grow: 1; font-family: inherit; font-size: inherit; }
    .ql-editor { font-family: inherit; font-size: 15px; line-height: 1.6; min-height: 400px; padding: 20px !important; }
    .ql-editor.ql-blank::before { font-family: inherit; color: #9ca3af; font-style: normal; font-weight: normal; }
    .font-hindi .ql-editor { font-size: 1.2rem; }
    .font-tamil .ql-editor { font-size: 1.2rem; }
`;
