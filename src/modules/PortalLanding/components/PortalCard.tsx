import React from 'react';
import { ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface PortalCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    bgIcon: React.ElementType;
    colorClass: string;
    accentColor: string;
    actionText: string;
    onClick: () => void;
}

export const PortalCard: React.FC<PortalCardProps> = ({
    title,
    description,
    icon: Icon,
    bgIcon: BgIcon,
    colorClass,
    accentColor,
    actionText,
    onClick
}) => {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group relative flex flex-col items-start p-10 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] text-left transition-all duration-700 overflow-hidden",
                `hover:bg-white/10 hover:border-${accentColor}/50 h-full hover:-translate-y-3 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]`
            )}
        >
            {/* Background Decorative Icon */}
            <div className={cn("absolute top-0 right-0 p-8 transition-all duration-700 opacity-5 group-hover:opacity-10 group-hover:scale-110", colorClass)}>
                <BgIcon size={180} />
            </div>

            {/* Icon Wrapper */}
            <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mb-8 border transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-2xl", `bg-${accentColor}/10 border-${accentColor}/20`)}>
                <Icon size={32} className={colorClass} />
            </div>

            <h2 className={cn("text-3xl font-black text-white mb-4 transition-colors duration-500", `group-hover:text-${accentColor}`)}>{title}</h2>
            <p className="text-white/40 text-sm leading-relaxed mb-12 max-w-[320px] font-medium">
                {description}
            </p>

            <div className={cn("mt-auto flex items-center text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 transform translate-x-[-20px] opacity-0 group-hover:translate-x-0 group-hover:opacity-100", colorClass)}>
                {actionText} <ChevronRight className="ml-2 w-4 h-4" />
            </div>

            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent pointer-events-none" />
        </button>
    );
};
