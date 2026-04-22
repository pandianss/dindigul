import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface NumericInputProps {
    label: string;
    value: number;
    onChange: (v: number) => void;
    prefix?: string;
    suffix?: string;
    helperText?: string;
    error?: any;
    readOnly?: boolean;
}

export const NumericInput: React.FC<NumericInputProps> = ({ 
    label, value, onChange, prefix = "₹", suffix = "'000", helperText, error, readOnly 
}) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
        <div className={cn(
            "group relative flex items-center bg-white border rounded-2xl transition-all h-12 overflow-hidden shadow-sm",
            error ? "border-red-200 ring-4 ring-red-50/50" : "border-slate-100 focus-within:ring-4 focus-within:ring-indigo-50/50",
            readOnly && "bg-slate-50/50 cursor-not-allowed opacity-80"
        )}>
            <span className="pl-4 pr-2 text-slate-300 font-bold">{prefix}</span>
            <input 
                type="number" 
                value={value || ''}
                onChange={(e) => !readOnly && onChange(parseFloat(e.target.value) || 0)}
                readOnly={readOnly}
                className="flex-1 bg-transparent border-none focus:ring-0 font-bold text-slate-700 text-sm"
                placeholder="0.00"
            />
            <span className="px-4 text-[10px] font-black text-slate-400 opacity-60 bg-slate-50/50 h-full flex items-center border-l border-slate-50 tracking-tighter">{suffix}</span>
        </div>
        {helperText && <p className="text-[9px] text-slate-400/80 ml-1 font-medium italic">{helperText}</p>}
    </div>
);
