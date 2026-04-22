import React from 'react';
import { format } from 'date-fns';
import { Tag } from 'lucide-react';
import { BranchRequest } from '../../types';
import { CATEGORY_ICONS, STATUS_COLORS } from '../../constants';

interface RequestListItemProps {
    req: BranchRequest;
    isSelected: boolean;
    viewMode: 'BRANCH' | 'RO';
    onSelect: (req: BranchRequest) => void;
}

export const RequestListItem: React.FC<RequestListItemProps> = ({
    req,
    isSelected,
    viewMode,
    onSelect
}) => {
    return (
        <div
            onClick={() => onSelect(req)}
            className={`p-5 cursor-pointer transition-all border rounded-2xl shadow-sm hover:shadow-md ${
                isSelected 
                    ? 'border-bank-navy ring-1 ring-bank-navy bg-blue-50/30' 
                    : 'border-gray-100 bg-white'
            }`}
        >
            <div className="flex items-start justify-between">
                <div className="flex space-x-4">
                    <div className={`p-3 rounded-xl bg-gray-50 ${STATUS_COLORS[req.status]}`}>
                        {React.createElement(CATEGORY_ICONS[req.category] || Tag, { size: 24 })}
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-bank-navy">{req.titleEn}</h4>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${STATUS_COLORS[req.status]}`}>
                                {req.status.replace('_', ' ')}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                            {viewMode === 'RO' ? `${req.branch.nameEn} (Code: ${req.branch.code})` : `Category: ${req.category}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 italic">
                            Requested on {format(new Date(req.createdAt), 'dd MMM, hh:mm a')}
                        </p>
                    </div>
                </div>
                <div className={`text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600`}>
                    {req.priority}
                </div>
            </div>
        </div>
    );
};
