import React from 'react';
import { Globe, Languages, Code } from 'lucide-react';
import { LANGUAGES } from '../../constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface EditorHeaderProps {
    activeLang: 'EN' | 'HI' | 'TA';
    setActiveLang: (l: 'EN' | 'HI' | 'TA') => void;
    isSourceMode: boolean;
    setIsSourceMode: (m: boolean) => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
    activeLang,
    setActiveLang,
    isSourceMode,
    setIsSourceMode
}) => {
    return (
        <div className="flex items-center space-x-1 mb-6 bg-gray-100 p-1 rounded-xl self-start">
            {LANGUAGES.map(lang => (
                <button
                    key={lang.code}
                    onClick={() => setActiveLang(lang.code as any)}
                    className={cn(
                        "px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-2",
                        activeLang === lang.code ? "bg-white text-bank-navy shadow-sm" : "text-gray-400 hover:text-gray-600"
                    )}
                >
                    {lang.code === 'EN' ? <Globe size={14} /> : <Languages size={14} />}
                    <span>{lang.label}</span>
                </button>
            ))}

            <div className="w-px h-4 bg-gray-200 mx-2" />

            <button
                onClick={() => setIsSourceMode(!isSourceMode)}
                title="Toggle HTML Source"
                className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center space-x-2",
                    isSourceMode 
                        ? "bg-bank-teal text-white shadow-lg" 
                        : "bg-white text-gray-500 hover:text-bank-navy border border-gray-100 shadow-sm"
                )}
            >
                <Code size={14} />
                <span>{isSourceMode ? 'EDIT VISUAL' : 'EDIT SOURCE'}</span>
            </button>
        </div>
    );
};
