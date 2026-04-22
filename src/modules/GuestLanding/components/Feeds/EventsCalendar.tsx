import React from 'react';
import { formatLocalISO } from '../../../../utils/dateUtils';
import { parseLocalISO } from '../../../../utils/dateUtils';
import { Event } from '../../types';

interface EventsCalendarProps {
    events: Event[];
}

export const EventsCalendar: React.FC<EventsCalendarProps> = ({ events }) => {
    if (!events?.length) return null;

    const groupedEvents = events.reduce((acc: any, event) => {
        const dateKey = formatLocalISO(parseLocalISO(event.date));
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(event);
        return acc;
    }, {} as any);

    return (
        <section id="events" className="py-16 px-8 bg-[#F5F7FA] border-t border-[#D0DCF0]">
            <div className="max-w-4xl mx-auto">
                <div className="mb-10 reveal text-center">
                    <h2 className="text-[clamp(1.4rem,2.5vw,2rem)] font-extrabold text-[#1B3A6B] tracking-[-0.02em] leading-[1.2] mb-2.5">
                        Upcoming Calendar Events
                    </h2>
                </div>
                <div className="space-y-6">
                    {Object.entries(groupedEvents)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([dateKey, dayEvents]: [string, any], dayIdx) => (
                            <div key={dayKey} className="flex gap-4 md:gap-8 reveal" style={{ transitionDelay: `${dayIdx * 100}ms` }}>
                                <div className="w-20 md:w-24 shrink-0">
                                    <div className="bg-white border border-[#D0DCF0] p-3 text-center rounded shadow-sm">
                                        <div className="text-[0.6rem] font-black text-[#0090C8] uppercase tracking-widest mb-1">
                                            {parseLocalISO(dateKey)?.toLocaleDateString('en-US', { month: 'short' })}
                                        </div>
                                        <div className="text-2xl font-black text-[#1B3A6B] leading-none mb-1">
                                            {parseLocalISO(dateKey)?.getDate()}
                                        </div>
                                        <div className="text-[0.6rem] font-bold text-[#5A708A] uppercase opacity-60">
                                            {parseLocalISO(dateKey)?.toLocaleDateString('en-US', { weekday: 'short' })}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-3 pt-1">
                                    {dayEvents.map((event: any, i: number) => (
                                        <div key={i} className="bg-white border border-[#D0DCF0] p-5 rounded-lg shadow-sm hover:border-[#0090C8] transition-colors">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className="text-[0.6rem] font-black bg-[#E0F4FB] text-[#0090C8] px-2 py-0.5 rounded-sm uppercase tracking-wider border border-[#0090C8]/20">
                                                    {event.type}
                                                </span>
                                            </div>
                                            <h3 className="text-base font-bold text-[#1B3A6B] mb-1 leading-tight">{event.name}</h3>
                                            {event.venue && (
                                                <div className="text-[0.75rem] text-[#5A708A] font-medium flex items-center gap-1.5">
                                                    <span className="opacity-40">📍</span> {event.venue}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    }
                </div>
            </div>
        </section>
    );
};
