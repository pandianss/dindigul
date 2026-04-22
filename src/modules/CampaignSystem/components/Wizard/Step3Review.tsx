import React from 'react';
import { Check } from 'lucide-react';
import { format } from 'date-fns';
import { Branch } from '../../types';

interface Step3ReviewProps {
    formData: any;
    branches: Branch[];
    branchTargets: Record<string, number>;
}

export const Step3Review: React.FC<Step3ReviewProps> = ({
    formData,
    branches,
    branchTargets
}) => {
    return (
        <div className="flex-grow flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-500">
            <div className="relative">
                <div className="absolute inset-0 bg-bank-teal/20 blur-[60px] rounded-full" />
                <div className="relative w-32 h-32 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center text-bank-teal border-4 border-bank-teal/10">
                    <Check size={64} className="animate-in zoom-in-50 duration-500" />
                </div>
            </div>
            <div className="max-w-md">
                <h3 className="text-3xl font-black text-bank-navy tracking-tight uppercase mb-2">Initialize Campaign</h3>
                <p className="text-gray-500 font-bold leading-relaxed tracking-tight">
                    You are about to launch <span className="text-bank-teal underline decoration-2">{formData.title}</span> across {branches.length} branches with a total regional target of <span className="font-black text-bank-navy">{formData.targetValue.toLocaleString()} {formData.metric}</span>.
                </p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-left">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 font-bold">Timeline</p>
                    <p className="text-sm font-black text-bank-navy">
                        Starts: {format(new Date(formData.startDate), 'dd MMMM')}<br/>
                        Ends: {format(new Date(formData.endDate), 'dd MMMM yyyy')}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-left">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 font-bold">Distribution</p>
                    <p className="text-sm font-black text-bank-navy">
                        Assigned to {Object.keys(branchTargets).length} Branches<br/>
                        Metric: {formData.metric}
                    </p>
                </div>
            </div>
        </div>
    );
};
