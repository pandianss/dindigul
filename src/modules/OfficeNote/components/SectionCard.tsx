import React from 'react';

interface SectionCardProps {
    title: string;
    children: React.ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, children }) => (
    <div className="p-6 bg-bank-teal/5 rounded-2xl border border-bank-teal/20 space-y-4">
        <h4 className="text-bank-navy font-bold text-sm uppercase tracking-wider border-b border-bank-teal/20 pb-2">
            {title}
        </h4>
        {children}
    </div>
);
