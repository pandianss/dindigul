import React from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { LetterForm } from '../../types';
import { QUILL_MODULES, EDITOR_STYLES } from '../../constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface RichTextEditorProps {
    formData: LetterForm;
    setFormData: (d: LetterForm | ((prev: LetterForm) => LetterForm)) => void;
    activeLang: 'EN' | 'HI' | 'TA';
    isSourceMode: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    formData,
    setFormData,
    activeLang,
    isSourceMode
}) => {
    const handleSubjectChange = (val: string) => {
        setFormData(prev => {
            const next = { ...prev };
            if (activeLang === 'EN') next.titleEn = val;
            else if (activeLang === 'HI') next.titleHi = val;
            else next.titleTa = val;
            return next;
        });
    };

    const handleBodyChange = (val: string) => {
        setFormData(prev => {
            const next = { ...prev };
            if (activeLang === 'EN') next.contentEn = val;
            else if (activeLang === 'HI') next.contentHi = val;
            else next.contentTa = val;
            return next;
        });
    };

    const currentTitle = activeLang === 'EN' ? formData.titleEn : activeLang === 'HI' ? formData.titleHi : formData.titleTa;
    const currentContent = activeLang === 'EN' ? formData.contentEn : activeLang === 'HI' ? formData.contentHi : formData.contentTa;

    return (
        <div className="space-y-4 flex-grow flex flex-col overflow-y-auto pr-2 custom-scrollbar">
            <style>{EDITOR_STYLES}</style>
            
            <div className="group">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block group-focus-within:text-bank-navy transition-colors">
                    {activeLang === 'EN' ? 'Subject' : activeLang === 'HI' ? 'विषय' : 'பொருள்'}
                </label>
                <input
                    type="text"
                    placeholder="Enter letter subject..."
                    value={currentTitle}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className={cn(
                        "w-full text-lg font-bold text-bank-navy border-0 border-b-2 border-gray-100 focus:ring-0 focus:border-bank-navy pb-2 transition-all outline-none",
                        activeLang === 'HI' ? 'font-hindi' : activeLang === 'TA' ? 'font-tamil' : ''
                    )}
                />
            </div>

            <div className="flex-grow flex flex-col min-h-[400px]">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Letter Body</label>
                <div className={cn(
                    "flex-grow border border-gray-100 rounded-xl overflow-hidden flex flex-col bg-gray-50",
                    activeLang === 'HI' ? 'font-hindi' : activeLang === 'TA' ? 'font-tamil' : ''
                )}>
                    {isSourceMode ? (
                        <textarea
                            value={currentContent}
                            onChange={(e) => handleBodyChange(e.target.value)}
                            className="flex-grow p-5 font-mono text-xs bg-gray-900 text-gray-100 outline-none resize-none leading-relaxed"
                            placeholder="Paste or write raw HTML code here..."
                        />
                    ) : (
                        <ReactQuill
                            key={activeLang}
                            theme="snow"
                            placeholder="Type your letter content here..."
                            value={currentContent}
                            onChange={handleBodyChange}
                            modules={QUILL_MODULES}
                            className="flex-grow flex flex-col"
                            style={{ height: '100%' }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
