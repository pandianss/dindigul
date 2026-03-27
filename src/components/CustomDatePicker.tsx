import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { format, isSameDay, isToday, getDaysInMonth, startOfMonth, getDay } from 'date-fns';

interface CustomDatePickerProps {
    selected: Date | null;
    onChange: (date: Date | null) => void;
    className?: string;
    placeholderText?: string;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
    selected,
    onChange,
    className,
    placeholderText = "Select Date"
}) => {
    const today = new Date();
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(selected || today);
    const [pickerMode, setPickerMode] = useState<'calendar' | 'year' | 'month'>('calendar');
    const [yearRangeStart, setYearRangeStart] = useState(Math.floor((selected?.getFullYear() || today.getFullYear()) / 12) * 12);
    const containerRef = useRef<HTMLDivElement>(null);

    const viewYear = viewDate.getFullYear();
    const viewMonth = viewDate.getMonth();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const prevMonth = () => {
        const newDate = new Date(viewYear, viewMonth - 1, 1);
        setViewDate(newDate);
    };

    const nextMonth = () => {
        const newDate = new Date(viewYear, viewMonth + 1, 1);
        setViewDate(newDate);
    };

    const handleDayClick = (day: number) => {
        const d = new Date(viewYear, viewMonth, day);
        onChange(d);
        setIsOpen(false);
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(viewDate);
        const firstDay = getDay(startOfMonth(viewDate));
        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        
        return (
            <div className="p-3">
                <div className="grid grid-cols-7 mb-2">
                    {DAYS.map(d => (
                        <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {cells.map((day, i) => {
                        if (day === null) return <div key={i} className="h-8" />;
                        const d = new Date(viewYear, viewMonth, day);
                        const isSel = selected && isSameDay(d, selected);
                        const isTod = isToday(d);
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => handleDayClick(day)}
                                className={`h-8 w-8 flex items-center justify-center rounded-lg text-xs transition-all ${
                                    isSel 
                                    ? 'bg-bank-navy text-white font-bold shadow-md' 
                                    : isTod 
                                        ? 'border border-bank-teal text-bank-teal font-bold' 
                                        : 'hover:bg-bank-teal/10 text-gray-700 hover:text-bank-teal'
                                }`}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={() => {
                            const t = new Date();
                            setViewDate(t);
                            onChange(t);
                            setIsOpen(false);
                        }}
                        className="text-[10px] font-bold text-bank-teal hover:underline uppercase tracking-tighter"
                    >
                        Today
                    </button>
                    {selected && (
                        <button
                            type="button"
                            onClick={() => {
                                onChange(null);
                                setIsOpen(false);
                            }}
                            className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-tighter"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const renderYearPicker = () => {
        const years = Array.from({ length: 12 }, (_, i) => yearRangeStart + i);
        return (
            <div className="p-3">
                <div className="grid grid-cols-3 gap-2">
                    {years.map(yr => (
                        <button
                            key={yr}
                            type="button"
                            onClick={() => {
                                setViewDate(new Date(yr, viewMonth, 1));
                                setPickerMode('month');
                            }}
                            className={`py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                                yr === viewYear 
                                ? 'bg-bank-navy text-white shadow-sm' 
                                : 'bg-gray-50 text-gray-600 hover:bg-bank-teal/10 hover:text-bank-teal border border-gray-100'
                            }`}
                        >
                            {yr}
                        </button>
                    ))}
                </div>
                <div className="mt-4 flex items-center gap-2 px-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase italic">Type Year</span>
                    <input
                        type="number"
                        className="w-full h-8 text-xs font-bold text-bank-navy border border-gray-200 rounded-lg px-3 outline-none focus:border-bank-teal focus:ring-1 focus:ring-bank-teal transition-all"
                        value={viewYear}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val > 1900 && val < 2100) {
                                setViewDate(new Date(val, viewMonth, 1));
                            }
                        }}
                    />
                </div>
            </div>
        );
    };

    const renderMonthPicker = () => {
        return (
            <div className="p-3">
                <div className="grid grid-cols-3 gap-2">
                    {MONTHS_SHORT.map((mo, idx) => (
                        <button
                            key={mo}
                            type="button"
                            onClick={() => {
                                setViewDate(new Date(viewYear, idx, 1));
                                setPickerMode('calendar');
                            }}
                            className={`py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                                idx === viewMonth 
                                ? 'bg-bank-navy text-white shadow-sm' 
                                : 'bg-gray-50 text-gray-600 hover:bg-bank-teal/10 hover:text-bank-teal border border-gray-100'
                            }`}
                        >
                            {mo}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="relative inline-block w-full" ref={containerRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full px-4 py-2 bg-white border rounded-xl cursor-pointer transition-all hover:border-bank-teal/50 shadow-sm ${
                    isOpen ? 'border-bank-teal ring-2 ring-bank-teal/10' : 'border-gray-200'
                } ${className}`}
            >
                <span className={`text-sm ${!selected ? 'text-gray-400' : 'text-bank-navy font-semibold'}`}>
                    {selected ? format(selected, 'dd MMM yyyy') : placeholderText}
                </span>
                <CalendarIcon size={16} className={selected ? 'text-bank-teal' : 'text-gray-400'} />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-bank-navy text-white">
                        <button
                            type="button"
                            onClick={() => {
                                if (pickerMode === 'calendar') prevMonth();
                                else if (pickerMode === 'year') setYearRangeStart(s => s - 12);
                                else if (pickerMode === 'month') setPickerMode('year');
                            }}
                            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (pickerMode === 'calendar') setPickerMode('year');
                                else setPickerMode('calendar');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1 hover:bg-white/10 rounded-lg transition-all"
                        >
                            <span className="text-sm font-bold uppercase tracking-wider">
                                {pickerMode === 'year' 
                                    ? `${yearRangeStart} - ${yearRangeStart + 11}`
                                    : pickerMode === 'month'
                                        ? `${viewYear}`
                                        : format(viewDate, 'MMMM yyyy')
                                }
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (pickerMode === 'calendar') nextMonth();
                                else if (pickerMode === 'year') setYearRangeStart(s => s + 12);
                            }}
                            className={`p-1.5 hover:bg-white/10 rounded-full transition-colors ${pickerMode === 'month' ? 'invisible' : ''}`}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    {pickerMode === 'calendar' && renderCalendar()}
                    {pickerMode === 'year' && renderYearPicker()}
                    {pickerMode === 'month' && renderMonthPicker()}
                </div>
            )}
        </div>
    );
};
