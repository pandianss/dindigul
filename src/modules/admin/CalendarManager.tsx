import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
    Calendar as CalendarIcon,
    Plus,
    Trash2,
    Settings,
    ChevronLeft,
    ChevronRight,
    Info,
    X,
    Save
} from 'lucide-react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    isSunday,
    isSaturday,
    isAfter,
    parseISO,
    startOfToday
} from 'date-fns';
import type { Holiday, DayType } from '../../types/calendar';
import { getCalendarStats, getWorkingDayWeight } from '../../utils/calendar';
import { cn } from '../../utils/cn';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/handleError';

const DAY_TYPE_COLORS: Record<DayType, string> = {
    'WORKING_DAY': 'bg-green-100 text-green-700',
    'PUBLIC_HOLIDAY': 'bg-red-100 text-red-700',
    'RBI_HOLIDAY': 'bg-purple-100 text-purple-700',
    'STATE_HOLIDAY': 'bg-blue-100 text-blue-700',
    'BANK_SPECIFIC_HOLIDAY': 'bg-amber-100 text-amber-700',
    'HALF_DAY': 'bg-yellow-100 text-yellow-700',
    'MEETING': 'bg-indigo-100 text-indigo-700',
    'SEMINAR': 'bg-pink-100 text-pink-700',
    'CONFERENCE': 'bg-cyan-100 text-cyan-700',
    'EVENT': 'bg-emerald-100 text-emerald-700'
};

const CalendarManager: React.FC = () => {
    const { t } = useTranslation();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [newHoliday, setNewHoliday] = useState<Partial<Holiday>>({
        date: format(startOfToday(), 'yyyy-MM-dd'),
        type: 'PUBLIC_HOLIDAY',
        name: '',
        venue: ''
    });

    const fetchHolidays = async () => {
        try {
            setLoading(true);
            const response = await api.get('/calendar/holidays');
            // Map nameEn from backend to name for frontend
            const mapped = response.data.map((h: any) => ({
                ...h,
                name: h.nameEn,
                date: format(new Date(h.date), 'yyyy-MM-dd')
            }));
            setHolidays(mapped);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHolidays();
    }, []);

    const stats = useMemo(() => getCalendarStats(startOfToday(), holidays), [holidays]);

    const { daysInMonth, paddingDays } = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });
        
        // Calculate padding days (0 for Sunday, 1 for Monday, etc.)
        const paddingCount = start.getDay();
        const padding = Array.from({ length: paddingCount });
        
        return { daysInMonth: days, paddingDays: padding };
    }, [currentMonth]);

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const handleAddHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newHoliday.name || !newHoliday.date || !newHoliday.type) return;

        try {
            await api.post('/calendar', {
                nameEn: newHoliday.name,
                date: newHoliday.date,
                type: newHoliday.type,
                venue: newHoliday.venue
            });

            setShowModal(false);
            setNewHoliday({ date: format(startOfToday(), 'yyyy-MM-dd'), type: 'PUBLIC_HOLIDAY', name: '' });
            fetchHolidays();
        } catch (err) {
            alert(getErrorMessage(err));
        }
    };

    const handleDeleteHoliday = async (id: string) => {
        if (window.confirm('Delete this holiday?')) {
            try {
                await api.delete(`/calendar/${id}`);
                fetchHolidays();
            } catch (err) {
                alert(getErrorMessage(err));
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy">{t('nav.calendar')}</h2>
                    <p className="text-gray-500 text-sm">Manage regional events, holidays and track working day pace for FY 2025-26</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-primary flex items-center space-x-2 shadow-lg shadow-bank-navy/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <Plus size={18} />
                        <span>Add Regional Event</span>
                    </button>
                </div>
            </div>

            {/* ... stats sections ... */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 xl:gap-6">
                <div className="card p-3 xl:p-4 flex items-center space-x-3 xl:space-x-4">
                    <div className="bg-bank-navy bg-opacity-10 p-2 xl:p-3 rounded-lg text-bank-navy shrink-0">
                        <CalendarIcon size={20} className="xl:w-6 xl:h-6" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">FY Working Days</div>
                        <div className="text-lg xl:text-xl font-black text-bank-navy truncate">
                            {stats.fy.elapsed} / {stats.fy.total}
                        </div>
                        <div className="text-[9px] text-gray-400 font-medium truncate">1 April - 31 March</div>
                    </div>
                </div>

                <div className="card p-3 xl:p-4 flex items-center space-x-3 xl:space-x-4">
                    <div className="bg-bank-teal bg-opacity-10 p-2 xl:p-3 rounded-lg text-bank-teal shrink-0">
                        <Settings size={20} className="xl:w-6 xl:h-6" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">Quarter Pace</div>
                        <div className="text-lg xl:text-xl font-black text-bank-navy truncate">
                            {((stats.quarter.elapsed / stats.quarter.total) * 100).toFixed(1)}%
                        </div>
                        <div className="text-[9px] text-gray-400 font-medium truncate">Q2: {stats.quarter.elapsed} of {stats.quarter.total}</div>
                    </div>
                </div>

                <div className="card p-3 xl:p-4 flex items-center space-x-3 xl:space-x-4 sm:col-span-2 xl:col-span-1">
                    <div className="bg-bank-gold bg-opacity-10 p-2 xl:p-3 rounded-lg text-bank-gold shrink-0">
                        <Info size={20} className="xl:w-6 xl:h-6" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">Current Month</div>
                        <div className="text-lg xl:text-xl font-black text-bank-navy truncate">
                            {stats.month.elapsed} / {stats.month.total}
                        </div>
                        <div className="text-[9px] text-gray-400 font-medium truncate">{format(currentMonth, 'MMMM yyyy')}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar View */}
                <div className="lg:col-span-2 card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-xl text-bank-navy tracking-tight uppercase">{format(currentMonth, 'MMMM yyyy')}</h3>
                        <div className="flex items-center space-x-2">
                            <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200">
                                <ChevronLeft size={20} className="text-gray-600" />
                            </button>
                            <button
                                onClick={() => setCurrentMonth(new Date())}
                                className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-bank-teal hover:bg-bank-teal/5 rounded-md transition-all"
                            >
                                Today
                            </button>
                            <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200">
                                <ChevronRight size={20} className="text-gray-600" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="bg-white/50 backdrop-blur-sm py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                {day}
                            </div>
                        ))}
                        
                        {/* Padding days for the previous month */}
                        {paddingDays.map((_, i) => (
                            <div key={`padding-${i}`} className="bg-gray-50/50 opacity-30 h-28 border-r border-b border-gray-100" />
                        ))}

                        {daysInMonth.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const dayEvents = holidays.filter(h => h.date === dateStr);
                            const weight = getWorkingDayWeight(day, holidays);
                            const isSun = isSunday(day);
                            const isSat = isSaturday(day);

                            return (
                                <div
                                    key={dateStr}
                                    className={cn(
                                        "bg-white h-28 p-2 relative transition-all hover:ring-2 hover:ring-bank-teal/20 hover:z-10 cursor-pointer group flex flex-col overflow-hidden",
                                        !isSameMonth(day, currentMonth) && "opacity-30 pointer-events-none bg-gray-50/50"
                                    )}
                                >
                                    <span className={cn(
                                        "text-[11px] font-black transition-all mb-1",
                                        isToday(day) ? "bg-bank-navy text-white h-6 w-6 rounded flex items-center justify-center -mt-1 -ml-1 shadow-md" : "text-gray-400",
                                        (isSun || (isSat && weight === 0)) && !isToday(day) && "text-red-400"
                                    )}>
                                        {format(day, 'd')}
                                    </span>

                                    <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar flex-1 pb-4">
                                        {dayEvents.map(evt => (
                                            <div key={evt.id} className={cn(
                                                "px-1.5 py-0.5 rounded text-[8px] font-bold truncate leading-tight uppercase tracking-tighter border",
                                                DAY_TYPE_COLORS[evt.type as DayType] || 'bg-gray-100 text-gray-700',
                                                "border-current/10"
                                            )} title={`${evt.name} ${evt.venue ? `@ ${evt.venue}` : ''}`}>
                                                {evt.name}
                                            </div>
                                        ))}

                                        {!dayEvents.length && isSat && weight === 0 && (
                                            <div className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-gray-50 text-gray-400 uppercase tracking-tighter border border-gray-100 italic">
                                                Holiday
                                            </div>
                                        )}
                                    </div>

                                    {!dayEvents.length && isSat && weight === 0 && (
                                        <div className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-gray-50 text-gray-400 uppercase tracking-tighter border border-gray-100 italic">
                                            Holiday
                                        </div>
                                    )}

                                    {weight === 0.5 && (
                                        <div className="absolute bottom-2 right-2 text-[9px] font-black text-amber-500 bg-amber-50 px-1.5 rounded border border-amber-100 uppercase tracking-tighter">
                                            0.5 WD
                                        </div>
                                    )}

                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-1.5 h-1.5 rounded-full bg-bank-teal/50 animate-pulse" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Legend & List */}
                <div className="space-y-6">
                    <div className="card p-6 bg-gradient-to-br from-white to-gray-50/50">
                        <h3 className="font-black text-xs text-bank-navy mb-5 border-b border-gray-100 pb-3 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-bank-teal rounded-full" />
                            Events Classification
                        </h3>
                        <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {Object.entries({
                                ...DAY_TYPE_COLORS,
                                'MEETING': 'bg-indigo-100 text-indigo-700',
                                'SEMINAR': 'bg-pink-100 text-pink-700',
                                'CONFERENCE': 'bg-cyan-100 text-cyan-700',
                                'EVENT': 'bg-emerald-100 text-emerald-700'
                            }).map(([type, colorClass]) => (
                                <div key={type} className="flex items-center space-x-3 group cursor-help">
                                    <div className={cn("w-3 h-3 rounded border shadow-sm transition-transform group-hover:scale-110", colorClass.split(' ')[0], "border-current/10")} />
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest truncate group-hover:text-bank-navy transition-colors">
                                        {type.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card p-0 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-white">
                            <h3 className="font-black text-xs text-bank-navy uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-bank-gold rounded-full" />
                                Upcoming Events
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {holidays.filter(h => isAfter(parseISO(h.date), subMonths(new Date(), 1))).map(h => (
                                <div key={h.id} className="p-5 flex items-center justify-between group hover:bg-gray-50 transition-all">
                                    <div className="min-w-0">
                                        <div className="text-xs font-black text-bank-navy uppercase tracking-tight truncate">{h.name}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{format(parseISO(h.date), 'dd MMM yyyy')} • {h.type.replace(/_/g, ' ')}</div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteHoliday(h.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {holidays.length === 0 && (
                                <div className="p-10 text-center text-gray-400 text-xs font-medium italic">No events mapped.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Holiday Modal */}
            {showModal && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                >
                    <div className="bg-white rounded-2xl shadow-2xl border border-bank-teal/20 w-full max-w-md overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-sm font-black text-bank-navy uppercase tracking-widest flex items-center gap-2">
                                <CalendarIcon size={18} className="text-bank-teal" />
                                Add Regional Event
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddHoliday} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Event Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Local Holiday, Festival..."
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bank-teal/20 outline-none font-bold text-bank-navy placeholder:text-gray-300 transition-all"
                                    value={newHoliday.name}
                                    onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bank-teal/20 outline-none font-bold text-bank-navy transition-all"
                                        value={newHoliday.date}
                                        onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Category</label>
                                    <select
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bank-teal/20 outline-none font-bold text-bank-navy transition-all"
                                        value={newHoliday.type}
                                        onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value as DayType })}
                                    >
                                        <option value="PUBLIC_HOLIDAY">Public Holiday</option>
                                        <option value="STATE_HOLIDAY">State Holiday</option>
                                        <option value="MEETING">Meeting</option>
                                        <option value="SEMINAR">Seminar</option>
                                        <option value="CONFERENCE">Conference</option>
                                        <option value="EVENT">Special Event</option>
                                        <option value="WORKING_DAY">Working Day</option>
                                        <option value="RBI_HOLIDAY">RBI Holiday</option>
                                        <option value="BANK_SPECIFIC_HOLIDAY">Bank Specific</option>
                                        <option value="HALF_DAY">Half Day</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Venue / Location (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Conference Hall, Regional Office, Zoom..."
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bank-teal/20 outline-none font-bold text-bank-navy placeholder:text-gray-300 transition-all"
                                    value={newHoliday.venue}
                                    onChange={e => setNewHoliday({ ...newHoliday, venue: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all uppercase text-[10px] tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-xl font-bold bg-bank-navy text-white shadow-lg shadow-bank-navy/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest"
                                >
                                    <Save size={16} />
                                    Map Event
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default CalendarManager;
