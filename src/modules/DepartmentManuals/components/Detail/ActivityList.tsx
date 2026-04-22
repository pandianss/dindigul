import React from 'react';
import { Calendar, Clock, CheckCircle2, LayoutGrid, Edit2, Trash2 } from 'lucide-react';
import { Activity } from '../../types';
import { FREQUENCY_CONFIG } from '../../constants';
import { cn } from '../../../../utils/cn';

interface ActivityListProps {
    activities: Activity[];
    isAuthorized: boolean;
    onEditActivity: (activity: Activity) => void;
    onDeleteActivity: (id: string) => void;
    canManageActivities: boolean;
}

export const ActivityList: React.FC<ActivityListProps> = ({
    activities,
    isAuthorized,
    onEditActivity,
    onDeleteActivity,
    canManageActivities
}) => {
    return (
        <div className="space-y-4 px-2 overflow-y-auto max-h-[500px] custom-scrollbar pb-10">
            {activities.map((activity) => {
                const freq = FREQUENCY_CONFIG[activity.frequency] || FREQUENCY_CONFIG['ADHOC'];
                return (
                    <div 
                        key={activity.id}
                        className="group relative bg-white p-6 rounded-[2.5rem] border border-gray-100 hover:border-bank-teal/30 transition-all hover:shadow-xl hover:shadow-gray-100 hover:-translate-x-1"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-5">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-all duration-500 group-hover:bg-bank-teal group-hover:border-bank-teal group-hover:text-white shadow-sm",
                                    freq.bg, freq.color
                                )}>
                                    <Calendar size={22} className="transition-colors group-hover:text-white" />
                                </div>
                                
                                <div className="pt-1">
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <h4 className="font-black text-bank-navy tracking-tight">{activity.titleEn}</h4>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all group-hover:bg-white group-hover:scale-105",
                                            freq.bg, freq.color
                                        )}>
                                            {freq.label}
                                        </span>
                                    </div>
                                    
                                    <div className="flex flex-col gap-1 mb-3">
                                        {activity.titleTa && <p className="font-tamil text-gray-400 text-sm">{activity.titleTa}</p>}
                                        {activity.titleHi && <p className="font-hindi text-gray-400 text-sm">{activity.titleHi}</p>}
                                    </div>

                                    {activity.description && (
                                        <div 
                                            className="text-gray-500 text-[11px] leading-relaxed max-w-xl mb-3 quill-content"
                                            dangerouslySetInnerHTML={{ __html: activity.description }}
                                        />
                                    )}
                                    
                                    <div className="flex items-center gap-4">
                                        {activity.dueDate && (
                                            <div className="flex items-center gap-2 text-[9px] font-bold text-bank-gold uppercase tracking-widest bg-bank-gold/5 px-2 py-1 rounded-lg">
                                                <Clock size={12} />
                                                Target: {activity.dueDate}
                                            </div>
                                        )}
                                        <div className={cn(
                                            "flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest",
                                            activity.status === 'ACTIVE' ? "text-emerald-500" : "text-rose-400"
                                        )}>
                                            <CheckCircle2 size={12} />
                                            Status: {activity.status}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {canManageActivities && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => onEditActivity(activity)}
                                        className="p-2 text-gray-400 hover:text-bank-teal transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => onDeleteActivity(activity.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {activities.length === 0 && (
                <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-gray-100">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <LayoutGrid className="text-gray-200" size={32} />
                    </div>
                    <p className="text-xs font-black text-gray-300 uppercase tracking-widest">No activities defined yet</p>
                </div>
            )}
        </div>
    );
};
