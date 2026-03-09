import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PresentationData } from '../../hooks/usePresentationData';
import type { SlideConfig } from '../../types/presentation';
import { SlideRenderer } from './SlideComponents';
import { X, ChevronLeft, ChevronRight, LayoutGrid, Clock } from 'lucide-react';

interface FullScreenShowProps {
    data: PresentationData;
    slides: SlideConfig[];
    onClose: () => void;
}

export const FullScreenShow: React.FC<FullScreenShowProps> = ({ data, slides, onClose }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showHud, setShowHud] = useState(true);
    const [showThumbnails, setShowThumbnails] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);

    const activeSlides = slides.filter(s => s.visible);
    const currentSlide = activeSlides[currentIndex];

    // Request fullscreen on mount
    useEffect(() => {
        if (containerRef.current && !document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.warn(`Error attempting to enable fullscreen: ${err.message}`);
            });
        }

        // Hide HUD after 3 seconds of mouse inactivity
        let timeout: number;
        const handleMouseMove = () => {
            setShowHud(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setShowHud(false), 3000);
        };

        document.addEventListener('mousemove', handleMouseMove);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            clearTimeout(timeout);
            if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
        };
    }, []);

    // Timer
    useEffect(() => {
        const timer = setInterval(() => setElapsedTime(e => e + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const nextSlide = useCallback(() => {
        setCurrentIndex(i => Math.min(i + 1, activeSlides.length - 1));
    }, [activeSlides.length]);

    const prevSlide = useCallback(() => {
        setCurrentIndex(i => Math.max(i - 1, 0));
    }, []);

    // Keyboard handlers
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') nextSlide();
            if (e.key === 'ArrowLeft' || e.key === 'Backspace') prevSlide();
            if (e.key === 'Escape') onClose();
            if (e.key === 'h' || e.key === 'H') setShowHud(h => !h);
            if (e.key === 'f' || e.key === 'F') {
                if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
                else document.exitFullscreen();
            }
            if (e.key === 't' || e.key === 'T') setShowThumbnails(t => !t);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nextSlide, prevSlide, onClose]);

    if (!currentSlide) return null;

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[100] bg-black flex flex-col cursor-none select-none transition-opacity duration-500"
            style={{ cursor: showHud ? 'default' : 'none' }}
        >
            {/* Main Area: Render the 16:9 slide scaled to fit viewport */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div
                    className="w-full h-full max-h-[1080px] max-w-[1920px] aspect-video bg-black rounded overflow-hidden shadow-2xl relative transition-transform duration-700 ease-out"
                    style={{
                        transform: showThumbnails ? 'scale(0.8) translateY(-5%)' : 'scale(1)',
                        opacity: 1
                    }}>
                    <SlideRenderer
                        data={data}
                        slide={currentSlide}
                        slideNumber={currentIndex + 1}
                        totalSlides={activeSlides.length}
                    />
                </div>
            </div>

            {/* Thumbnails Strip */}
            <div className={`fixed bottom-24 left-0 w-full bg-black/90 p-4 border-t border-gray-800 transition-transform duration-500 ease-in-out ${showThumbnails ? 'translate-y-0' : 'translate-y-full opacity-0'}`} style={{ zIndex: 101 }}>
                <div className="flex gap-4 overflow-x-auto pb-2 px-8 custom-scrollbar items-end h-32">
                    {activeSlides.map((s, idx) => (
                        <div
                            key={s.id}
                            onClick={() => { setCurrentIndex(idx); setShowThumbnails(false); }}
                            className={`min-w-[160px] h-[90px] rounded border-2 cursor-pointer overflow-hidden transition-all ${idx === currentIndex ? 'border-bank-gold scale-110 shadow-[0_0_15px_rgba(212,175,55,0.5)]' : 'border-gray-700 opacity-50 hover:opacity-100 hover:border-gray-400'}`}
                        >
                            {/* A micro-preview. For performance we just show the title or type */}
                            <div className="w-full h-full bg-[#111] flex flex-col p-2 text-xs">
                                <span className="text-gray-400 mb-1 slide-mono">{idx + 1}</span>
                                <span className="text-white font-bold truncate">{s.type.replace(/_/g, ' ')}</span>
                                <span className="text-bank-teal truncate opacity-80">{s.parameterName || s.title}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Presenter HUD Overlay (only visible when mouse moves) */}
            <div className={`fixed bottom-0 left-0 w-full p-4 flex items-center justify-between text-white bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-300 z-[102] ${showHud ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex items-center gap-6 pl-4">
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white" title="Exit Presentation (Esc)">
                        <X className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-3 slide-mono bg-black/50 px-4 py-2 rounded-lg border border-white/10 shadow-lg">
                        <Clock className="w-4 h-4 text-bank-gold" />
                        <span className="text-lg font-bold tracking-widest">{formatTime(elapsedTime)}</span>
                        <div className="h-4 w-px bg-white/20 mx-2" />
                        <span className="text-blue-200">Slide {currentIndex + 1}</span>
                        <span className="text-gray-500">/ {activeSlides.length}</span>
                    </div>

                    <div className="text-sm slide-display text-gray-400">
                        Type: <span className="text-blue-300 font-bold">{currentSlide.type}</span>
                    </div>
                </div>

                <div className="flex-1 flex justify-center px-8">
                    {/* Presenter Notes */}
                    {currentSlide.notes && (
                        <div className="bg-yellow-900/40 border border-yellow-700/50 text-yellow-200 px-6 py-3 rounded-lg max-w-2xl slide-display italic opacity-90 shadow-2xl backdrop-blur-md">
                            🎯 {currentSlide.notes}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 pr-4">
                    <button onClick={() => setShowThumbnails(!showThumbnails)} className={`p-3 rounded-full transition-colors border shadow-lg ${showThumbnails ? 'bg-bank-gold text-black border-bank-gold' : 'bg-black/50 text-gray-300 border-white/10 hover:bg-white/10'}`} title="Thumbnails (T)">
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                    <div className="flex gap-2">
                        <button disabled={currentIndex === 0} onClick={prevSlide} className="p-4 bg-black/50 hover:bg-white/20 disabled:opacity-30 rounded-full border border-white/10 transition-colors shadow-lg" title="Previous Slide (Left Arrow)">
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                        <button disabled={currentIndex === activeSlides.length - 1} onClick={nextSlide} className="p-4 bg-black/50 hover:bg-white/20 disabled:opacity-30 rounded-full border border-white/10 transition-colors shadow-lg" title="Next Slide (Right Arrow, Space)">
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
