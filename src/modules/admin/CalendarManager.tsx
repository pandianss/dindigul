import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Calendar as CalendarIcon,
    Plus,
    Trash2,
    Settings,
    ChevronLeft,
    ChevronRight,
    Info
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
    parseISO
} from 'date-fns';
import type { Holiday, DayType } from '../../types/calendar';
import { getCalendarStats, getWorkingDayWeight } from '../../utils/calendar';
import { cn } from '../../utils/cn';

const DAY_TYPE_COLORS: Record<DayType, string> = {
    'WORKING_DAY': 'bg-green-100 text-green-700',
    'PUBLIC_HOLIDAY': 'bg-red-100 text-red-700',
    'RBI_HOLIDAY': 'bg-purple-100 text-purple-700',
    'STATE_HOLIDAY': 'bg-blue-100 text-blue-700',
    'BANK_SPECIFIC_HOLIDAY': 'bg-amber-100 text-amber-700',
    'HALF_DAY': 'bg-yellow-100 text-yellow-700'
};

const CalendarManager: React.FC = () => {
    const { t } = useTranslation();
    const [currentMonth, setCurrentMonth] = useState(new Date(2025, 7, 1)); // August 2025
    const [holidays] = useState<Holiday[]>([
        { id: '1', date: '2025-08-15', type: 'PUBLIC_HOLIDAY', name: 'Independence Day' },
        { id: '2', date: '2025-08-16', type: 'STATE_HOLIDAY', name: 'Local Festival' }
    ]);

    const stats = useMemo(() => getCalendarStats(new Date(2025, 7, 18), holidays), [holidays]);

    const daysInMonth = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy">{t('nav.calendar')}</h2>
                    <p className="text-gray-500 text-sm">Manage regional holidays and track working day pace for FY 2025-26</p>
                </div>
                <div className="flex space-x-3">
                    <button className="btn-primary flex items-center space-x-2">
                        <Plus size={18} />
                        <span>Add Holiday</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
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
                        <h3 className="font-bold text-lg text-bank-navy">{format(currentMonth, 'MMMM yyyy')}</h3>
                        <div className="flex items-center space-x-2">
                            <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ChevronLeft size={20} />
                            </button>
                            <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="bg-gray-50 py-2 text-center text-xs font-bold text-gray-500 uppercase">
                                {day}
                            </div>
                        ))}
                        {daysInMonth.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const holiday = holidays.find(h => h.date === dateStr);
                            const weight = getWorkingDayWeight(day, holidays);
                            const isSun = isSunday(day);
                            const isSat = isSaturday(day);

                            return (
                                <div
                                    key={dateStr}
                                    className={cn(
                                        "bg-white h-24 p-2 relative transition-all hover:bg-gray-50 cursor-pointer group",
                                        !isSameMonth(day, currentMonth) && "opacity-30 pointer-events-none"
                                    )}
                                >
                                    <span className={cn(
                                        "text-sm font-semibold",
                                        isToday(day) ? "bg-bank-navy text-white h-6 w-6 rounded-full flex items-center justify-center" : "text-gray-700",
                                        (isSun || (isSat && weight === 0)) && !isToday(day) && "text-red-400"
                                    )}>
                                        {format(day, 'd')}
                                    </span>

                                    {holiday && (
                                        <div className={cn(
                                            "mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold truncate leading-tight",
                                            DAY_TYPE_COLORS[holiday.type]
                                        )}>
                                            {holiday.name}
                                        </div>
                                    )}

                                    {!holiday && isSat && weight === 0 && (
                                        <div className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold truncate leading-tight bg-gray-100 text-gray-500">
                                            2nd/4th Sat
                                        </div>
                                    )}

                                    {weight === 0.5 && (
                                        <div className="absolute bottom-2 right-2 text-[10px] font-bold text-amber-500">
                                            0.5 WD
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Legend & List */}
                <div className="space-y-6">
                    <div className="card p-6">
                        <h3 className="font-bold text-bank-navy mb-4 border-b pb-2">Holiday Types</h3>
                        <div className="space-y-3">
                            {Object.entries(DAY_TYPE_COLORS).map(([type, colorClass]) => (
                                <div key={type} className="flex items-center space-x-3">
                                    <div className={cn("w-3 h-3 rounded-full", colorClass.split(' ')[0])} />
                                    <span className="text-xs font-medium text-gray-600 truncate">
                                        {type.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            ))}
                            <div className="flex items-center space-x-3 pt-2 border-t mt-3">
                                <div className="w-3 h-3 rounded-full bg-gray-100" />
                                <span className="text-xs font-medium text-gray-400">Weekend (Non-working)</span>
                            </div>
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="font-bold text-bank-navy mb-4 border-b pb-2">Upcoming Holidays</h3>
                        <div className="space-y-4">
                            {holidays.filter(h => isAfter(parseISO(h.date), subMonths(new Date(), 1))).map(h => (
                                <div key={h.id} className="flex items-center justify-between group">
                                    <div>
                                        <div className="text-sm font-bold text-gray-800">{h.name}</div>
                                        <div className="text-xs text-gray-500">{format(parseISO(h.date), 'dd MMM yyyy')}</div>
                                    </div>
                                    <button className="p-1.5 text-red-400 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarManager;
