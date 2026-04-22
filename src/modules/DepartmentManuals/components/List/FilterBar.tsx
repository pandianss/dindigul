import React from 'react';
import { Search, Filter, LayoutGrid, List as ListIcon, Plus } from 'lucide-react';
import { Department } from '../../types';

interface FilterBarProps {
    search: string;
    setSearch: (val: string) => void;
    filterDeptId: string;
    setFilterDeptId: (val: string) => void;
    departments: Department[];
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
    isAuthorized: boolean;
    onCreateManual: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
    search, setSearch,
    filterDeptId, setFilterDeptId,
    departments,
    viewMode, setViewMode,
    isAuthorized,
    onCreateManual
}) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative group min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-bank-teal transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Search manuals..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-bank-teal/5 focus:border-bank-teal transition-all text-xs font-medium"
                    />
                </div>

                <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-3 py-1.5 shadow-sm">
                    <Filter size={14} className="text-gray-400" />
                    <select
                        value={filterDeptId}
                        onChange={(e) => setFilterDeptId(e.target.value)}
                        className="border-none bg-transparent text-[10px] font-black uppercase tracking-widest text-bank-navy focus:ring-0 cursor-pointer"
                    >
                        <option value="all">All Departments</option>
                        {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.nameEn}</option>
                        ))}
                    </select>
                </div>
                
                <button 
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className="p-2 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-bank-navy transition-all shadow-sm"
                >
                    {viewMode === 'grid' ? <ListIcon size={18} /> : <LayoutGrid size={18} />}
                </button>

                {isAuthorized && (
                    <button 
                        onClick={onCreateManual}
                        className="flex items-center gap-2 px-5 py-2.5 bg-bank-navy text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-opacity-90 shadow-lg shadow-bank-navy/20 transition-all active:scale-95"
                    >
                        <Plus size={16} />
                        Create Manual
                    </button>
                )}
            </div>
        </div>
    );
};
