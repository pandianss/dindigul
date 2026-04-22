import { Bell, Search, Pin, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';

interface Notice {
    id: string;
    titleEn: string;
    contentEn: string;
    category: string;
    priority: string;
    isPinned: boolean;
    createdAt: string;
}

interface NoticeBoardViewProps {
    notices: Notice[];
    loading: boolean;
    filter: string;
    onFilterChange: (value: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    'OPERATIONAL': 'bg-blue-100 text-blue-700',
    'COMPLIANCE': 'bg-purple-100 text-purple-700',
    'HR': 'bg-green-100 text-green-700',
    'GENERAL': 'bg-gray-100 text-gray-700'
};

export default function NoticeBoardView({ notices, loading, filter, onFilterChange }: NoticeBoardViewProps) {
    const filteredNotices = notices.filter(n =>
        n.titleEn.toLowerCase().includes(filter.toLowerCase()) ||
        n.category.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-bank-navy">Notice Board</h2>
                    <p className="text-gray-500">Official circulars and regional announcements</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search notices..."
                        value={filter}
                        onChange={(e) => onFilterChange(e.target.value)}
                        className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-bank-navy outline-none w-64 shadow-sm"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bank-navy"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredNotices.length > 0 ? (
                        filteredNotices.map(notice => (
                            <div key={notice.id} className={cn(
                                "card p-6 relative transition-all hover:shadow-md",
                                notice.isPinned && "border-l-4 border-l-bank-gold"
                            )}>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center space-x-3">
                                            {notice.isPinned && <Pin size={16} className="text-bank-gold fill-bank-gold rotate-45" />}
                                            <h3 className="text-lg font-bold text-bank-navy">{notice.titleEn}</h3>
                                            <span className={cn(
                                                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                                CATEGORY_COLORS[notice.category] || "bg-gray-100"
                                            )}>
                                                {notice.category}
                                            </span>
                                            {notice.priority === 'URGENT' && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-red-100 text-red-700 animate-pulse">
                                                    Urgent
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-600 line-clamp-2">{notice.contentEn}</p>
                                        <div className="flex items-center space-x-4 text-xs font-medium text-gray-400">
                                            <div className="flex items-center space-x-1">
                                                <Calendar size={14} />
                                                <span>{format(new Date(notice.createdAt), 'dd MMM yyyy, hh:mm a')}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <Tag size={14} />
                                                <span>RO Admin</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="text-bank-navy font-bold text-sm hover:underline ml-4">View More</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 card bg-gray-50 border-dashed">
                            <Bell className="mx-auto text-gray-300 mb-2" size={32} />
                            <p className="text-gray-500 font-medium">No notices found</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

