import React from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { MEETING_TEMPLATES, QUILL_MODULES, QUILL_STYLE } from '../../../constants';

interface MinutesStepProps {
    minutesHtml: string;
    setMinutesHtml: (h: string) => void;
}

export const MinutesStep: React.FC<MinutesStepProps> = ({
    minutesHtml,
    setMinutesHtml
}) => {
    const handleApplyTemplate = (type: keyof typeof MEETING_TEMPLATES) => {
        if (minutesHtml && !confirm('Applying a template will overwrite your current content. Proceed?')) return;
        setMinutesHtml(MEETING_TEMPLATES[type]);
    };

    return (
        <div className="bg-white min-h-[700px] rounded-sm border border-gray-200 shadow-2xl flex flex-col group relative animate-in zoom-in-95">
            <div className="p-6 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xs font-black text-bank-navy uppercase tracking-widest">Step 4: Meeting Brief (Proceedings)</h3>
                <div className="flex gap-1.5 rounded-lg bg-white p-1 shadow-sm border border-gray-100">
                    <button 
                        type="button"
                        onClick={() => handleApplyTemplate('performance')} 
                        className="px-2 py-1 text-[8px] font-black uppercase text-gray-400 hover:text-bank-navy transition-colors"
                    >
                        Performance
                    </button>
                    <button 
                        type="button"
                        onClick={() => handleApplyTemplate('general')} 
                        className="px-2 py-1 text-[8px] font-black uppercase text-gray-400 hover:text-bank-navy border-x border-gray-100 transition-colors"
                    >
                        General
                    </button>
                    <button 
                        type="button"
                        onClick={() => handleApplyTemplate('audit')} 
                        className="px-2 py-1 text-[8px] font-black uppercase text-gray-400 hover:text-bank-navy transition-colors"
                    >
                        Audit
                    </button>
                </div>
            </div>
            <style>{QUILL_STYLE}</style>
            <ReactQuill 
                theme="snow"
                value={minutesHtml} 
                onChange={setMinutesHtml}
                modules={QUILL_MODULES}
                placeholder="Record meeting proceedings, deliberations, and resolutions here..."
                className="flex-1"
            />
        </div>
    );
};
