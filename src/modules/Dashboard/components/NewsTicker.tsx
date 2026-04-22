import React, { useEffect, useRef } from 'react';
import { Newspaper } from 'lucide-react';

interface NewsTickerProps {
    items: { text: string; link?: string }[];
}

export const NewsTicker: React.FC<NewsTickerProps> = ({ items = [] }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || items.length === 0) return;
        let raf: number;
        let x = 0;
        const speed = 0.6;
        const animate = () => {
            x -= speed;
            if (x < -el.scrollWidth / 2) x = 0;
            el.style.transform = `translateX(${x}px)`;
            raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(raf);
    }, [items]);

    if (items.length === 0) return null;

    const doubled = [...items, ...items];

    return (
        <div className="bg-bank-navy h-10 flex items-center border-b border-bank-gold relative overflow-hidden shadow-sm">
            <div className="bg-bank-gold px-5 h-full flex items-center gap-2 relative z-20 shadow-[8px_0_16px_rgba(0,0,0,0.1)]">
                <Newspaper size={14} className="text-bank-navy" strokeWidth={3} />
                <span className="text-[11px] font-black text-bank-navy uppercase tracking-[0.25em] whitespace-nowrap pt-0.5">
                    Live Intel
                </span>
            </div>
            
            <div className="flex-1 overflow-hidden relative z-10">
                <div ref={ref} className="flex whitespace-nowrap items-center h-full">
                    {doubled.map((item, i) => (
                        <div key={i} className="flex items-center gap-8 px-8 group">
                            <span className="text-[13px] font-bold text-white/70 tracking-tight transition-colors group-hover:text-white">
                                {item.link ? (
                                    <a
                                        href={item.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-bank-gold transition-colors decoration-bank-gold/20"
                                    >
                                        {item.text}
                                    </a>
                                ) : item.text}
                            </span>
                            <div className="w-1.5 h-1.5 rounded-full bg-bank-gold/40 shadow-[0_0_8px_rgba(201,168,76,0.3)] group-hover:bg-bank-gold group-hover:scale-125 transition-all" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Subtle edge fade gradients */}
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-bank-navy to-transparent z-15 pointer-events-none" />
        </div>
    );
};

