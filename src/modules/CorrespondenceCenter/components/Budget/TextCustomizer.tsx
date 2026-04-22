import React from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface TextCustomizerProps {
    specificDirective: string;
    setSpecificDirective: (val: string) => void;
    customIntro: string;
    setCustomIntro: (val: string) => void;
    customOutro: string;
    setCustomOutro: (val: string) => void;
}

export const TextCustomizer: React.FC<TextCustomizerProps> = ({
    specificDirective,
    setSpecificDirective,
    customIntro,
    setCustomIntro,
    customOutro,
    setCustomOutro
}) => {
    const modules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'bullet' }, { 'list': 'ordered' }],
            ['clean']
        ],
    };

    return (
        <div className="space-y-4 pt-4 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">4. Customize Letter Components</label>
            <div className="space-y-4">
                <div className="group">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Directives Reference (e.g. Email dated 07.04.2026)</label>
                    <input 
                        type="text"
                        value={specificDirective}
                        onChange={(e) => setSpecificDirective(e.target.value)}
                        placeholder="Leave blank for standard RO directions"
                        className="w-full bg-gray-50 border-gray-100 rounded-lg px-3 py-2 text-sm text-bank-navy focus:bg-white"
                    />
                </div>
                <div className="group">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Custom Introduction (Optional)</label>
                    <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-bank-teal/20 transition-all">
                        <ReactQuill 
                            theme="snow"
                            value={customIntro}
                            onChange={setCustomIntro}
                            placeholder="Example: We are pleased to announce the approved budgets for the coming year..."
                            modules={modules}
                        />
                    </div>
                </div>
                <div className="group">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Custom Utilization Instructions (Optional)</label>
                    <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-bank-teal/20 transition-all">
                        <ReactQuill 
                            theme="snow"
                            value={customOutro}
                            onChange={setCustomOutro}
                            placeholder="Specific usage guidelines or caveats..."
                            modules={modules}
                        />
                    </div>
                </div>
                <style>{`
                    .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #f3f4f6 !important; background: white; padding: 4px 8px !important; }
                    .ql-container.ql-snow { border: none !important; font-family: inherit; font-size: 13px; min-height: 80px; }
                    .ql-editor { padding: 8px 12px !important; min-height: 80px; }
                `}</style>
            </div>
        </div>
    );
};
