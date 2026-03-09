import React, { useState, useEffect } from 'react';
import { usePresentationData } from '../../hooks/usePresentationData';
import type { SlideConfig } from '../../types/presentation';
import { generateDefaultSlides } from '../../hooks/usePresentationData';
import { SlideRenderer } from './SlideComponents';
import { FullScreenShow } from './FullScreenShow';
import api from '../../services/api';
import { MonitorPlay, Save, FileEdit, Eye, Play, ArrowUp, ArrowDown, EyeOff, FileText, Calendar, Plus, LayoutGrid } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export const PresentationStudio: React.FC = () => {
    // Data Hook
    const { loading, error, data, load } = usePresentationData();

    // Studio State
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [slides, setSlides] = useState<SlideConfig[]>([]);
    const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
    const [deckName, setDeckName] = useState('My Presentation');
    const [showingFullScreen, setShowingFullScreen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Initial load
    useEffect(() => {
        const dStr = selectedDate.toISOString().split('T')[0];
        load(dStr);
    }, [selectedDate, load]);

    // When data changes, if no slides, generate defaults
    useEffect(() => {
        if (data && slides.length === 0) {
            const defaults = generateDefaultSlides(data);
            setSlides(defaults);
            setActiveSlideId(defaults[0]?.id || null);
        }
    }, [data, slides.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSave = async () => {
        if (!data) return;
        setSaving(true);
        try {
            await api.post('/presentations', {
                name: deckName,
                dataDate: data.date,
                period: data.period,
                slides: slides
            });
            alert('Presentation saved successfully!');
        } catch (e: any) {
            alert('Failed to save: ' + (e.response?.data?.error || e.message));
        } finally {
            setSaving(false);
        }
    };

    const updateSlide = (id: string, updates: Partial<SlideConfig>) => {
        setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const moveSlide = (id: string, direction: 'UP' | 'DOWN') => {
        const idx = slides.findIndex(s => s.id === id);
        if (idx < 0) return;
        if (direction === 'UP' && idx > 0) {
            const newSlides = [...slides];
            [newSlides[idx - 1], newSlides[idx]] = [newSlides[idx], newSlides[idx - 1]];
            // Update physical order props
            newSlides.forEach((s, i) => s.order = i);
            setSlides(newSlides);
        } else if (direction === 'DOWN' && idx < slides.length - 1) {
            const newSlides = [...slides];
            [newSlides[idx + 1], newSlides[idx]] = [newSlides[idx], newSlides[idx + 1]];
            newSlides.forEach((s, i) => s.order = i);
            setSlides(newSlides);
        }
    };

    const activeSlide = slides.find(s => s.id === activeSlideId);

    if (showingFullScreen && data) {
        return <FullScreenShow data={data} slides={slides} onClose={() => setShowingFullScreen(false)} />;
    }

    return (
        <div className="flex h-full flex-col bg-gray-50 border-t border-gray-200">
            {/* Top Toolbar */}
            <div className="bg-white px-6 py-4 flex items-center justify-between border-b shadow-sm z-10">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 text-bank-navy">
                        <MonitorPlay className="w-7 h-7" />
                        <div>
                            <h1 className="text-xl font-bold font-sans">Presentation Studio</h1>
                            <p className="text-xs text-gray-500 uppercase tracking-widest">Regional Reviews</p>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-gray-200 mx-2" />

                    {/* Date Picker */}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <DatePicker
                            selected={selectedDate}
                            onChange={(d: Date | null) => { if (d) { setSelectedDate(d); setSlides([]); } }}
                            dateFormat="dd MMM yyyy"
                            className="text-sm border-none bg-gray-100 hover:bg-gray-200 rounded px-3 py-1.5 focus:ring-2 focus:ring-bank-teal w-32 font-medium"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        value={deckName}
                        onChange={e => setDeckName(e.target.value)}
                        className="text-sm border-gray-300 rounded-md px-3 py-1.5 w-64 bg-gray-50 focus:bg-white transition-colors border shadow-inner"
                        placeholder="Deck Name"
                    />

                    <button onClick={handleSave} disabled={saving || !data} className="btn-primary flex items-center gap-2 bg-white text-bank-navy border border-gray-300 hover:bg-gray-50 shadow-sm">
                        <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Deck'}
                    </button>

                    <button onClick={() => setShowingFullScreen(true)} disabled={!data || slides.length === 0} className="btn-primary flex items-center gap-2 bg-bank-navy shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all">
                        <Play className="w-4 h-4" /> Present Fullscreen
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bank-navy"></div>
                </div>
            ) : error ? (
                <div className="flex-1 flex items-center justify-center p-8 text-red-500">
                    {error}
                </div>
            ) : data && (
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Pane: Slide List Builder */}
                    <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-inner z-0">
                        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2 text-gray-700">
                                <LayoutGrid className="w-4 h-4" /> Slides ({slides.filter(s => s.visible).length})
                            </h3>
                            <button className="text-bank-teal hover:bg-bank-teal/10 p-1 rounded" title="Add Slide (WIP)">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            {slides.map((s, idx) => (
                                <div
                                    key={s.id}
                                    onClick={() => setActiveSlideId(s.id)}
                                    className={`
                                        mb-2 p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3
                                        ${activeSlideId === s.id ? 'border-bank-navy bg-blue-50/50 shadow-sm' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}
                                        ${!s.visible ? 'opacity-50 grayscale' : ''}
                                    `}
                                >
                                    <div className="slide-mono text-xs font-bold text-gray-400 w-4">{idx + 1}</div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="text-xs font-bold text-bank-navy truncate">{s.type.replace(/_/g, ' ')}</div>
                                        <div className="text-[10px] text-gray-500 truncate">{s.parameterName || s.title || (s.customContent ? s.customContent.heading : '')}</div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); moveSlide(s.id, 'UP'); }} className="p-0.5 text-gray-400 hover:text-bank-navy hover:bg-gray-200 rounded"><ArrowUp className="w-3 h-3" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); moveSlide(s.id, 'DOWN'); }} className="p-0.5 text-gray-400 hover:text-bank-navy hover:bg-gray-200 rounded"><ArrowDown className="w-3 h-3" /></button>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); updateSlide(s.id, { visible: !s.visible }); }}
                                        className={`p-1 rounded ml-1 ${s.visible ? 'text-gray-400 hover:text-gray-600' : 'text-red-400 hover:bg-red-50'}`}
                                    >
                                        {s.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Middle Pane: Editor / Configure Active Slide */}
                    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
                        <div className="p-4 border-b bg-white">
                            <h3 className="font-bold flex items-center gap-2 text-gray-700">
                                <FileEdit className="w-4 h-4" /> Slide Settings
                            </h3>
                        </div>
                        {activeSlide ? (
                            <div className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Slide Type</label>
                                    <div className="px-3 py-2 bg-gray-200 rounded text-sm text-gray-700 font-mono">{activeSlide.type}</div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Custom Title Override</label>
                                    <input
                                        type="text"
                                        value={activeSlide.title || ''}
                                        onChange={e => updateSlide(activeSlide.id, { title: e.target.value })}
                                        className="w-full text-sm border-gray-300 rounded px-3 py-2 border focus:ring-1 focus:ring-bank-navy"
                                        placeholder="Leave empty for default"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">On-Screen Annotation (Bottom Left)</label>
                                    <input
                                        type="text"
                                        value={activeSlide.annotation || ''}
                                        onChange={e => updateSlide(activeSlide.id, { annotation: e.target.value })}
                                        className="w-full text-sm border-gray-300 rounded px-3 py-2 border focus:ring-1 focus:ring-bank-navy"
                                        placeholder="e.g. Needs Management Attention"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Presenter Notes (Visible in HUD)</label>
                                    <textarea
                                        value={activeSlide.notes || ''}
                                        onChange={e => updateSlide(activeSlide.id, { notes: e.target.value })}
                                        className="w-full text-sm border-gray-300 rounded px-3 py-2 border h-24 resize-none focus:ring-1 focus:ring-bank-navy"
                                        placeholder="Private notes for the presenter..."
                                    />
                                </div>

                                {activeSlide.type === 'CUSTOM_TEXT' && activeSlide.customContent && (
                                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mt-2 flex flex-col gap-3">
                                        <h4 className="font-bold text-yellow-900 flex items-center gap-2 text-sm"><FileText className="w-4 h-4" /> Custom Content</h4>
                                        <input
                                            className="w-full text-sm border-yellow-300 rounded px-3 py-2 border"
                                            value={activeSlide.customContent.heading}
                                            onChange={e => updateSlide(activeSlide.id, { customContent: { ...activeSlide.customContent!, heading: e.target.value } })}
                                            placeholder="Heading"
                                        />
                                        <textarea
                                            className="w-full text-sm border-yellow-300 rounded px-3 py-2 border h-32"
                                            value={activeSlide.customContent.body}
                                            onChange={e => updateSlide(activeSlide.id, { customContent: { ...activeSlide.customContent!, body: e.target.value } })}
                                            placeholder="Body text..."
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-400 text-sm">
                                Select a slide from the left panel to edit its settings.
                            </div>
                        )}
                    </div>

                    {/* Right Pane: Live View */}
                    <div className="flex-1 bg-gray-200/50 p-8 flex flex-col items-center justify-center overflow-auto relative dotted-bg">
                        <div className="absolute top-4 right-6 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm text-xs font-bold text-gray-500 border">
                            <Eye className="w-3.5 h-3.5" /> Live Preview
                        </div>
                        {activeSlide ? (
                            <div className="w-full max-w-5xl aspect-video shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-lg overflow-hidden ring-1 ring-black/5 flex-shrink-0 transition-all duration-300">
                                <SlideRenderer
                                    data={data}
                                    slide={activeSlide}
                                    slideNumber={slides.filter(s => s.visible).findIndex(s => s.id === activeSlide.id) + 1}
                                    totalSlides={slides.filter(s => s.visible).length}
                                />
                            </div>
                        ) : (
                            <div className="p-8 text-gray-400 slide-mono">No slide selected</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
